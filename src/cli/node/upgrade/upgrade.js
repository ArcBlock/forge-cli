const inquirer = require('inquirer');
const semver = require('semver');
const shell = require('shelljs');
const chalk = require('chalk');

const { config, createRpcClient } = require('core/env');
const { hr, getSpinner, pretty } = require('core/ui');
const {
  fetchAsset,
  getPlatform,
  print,
  printError,
  printInfo,
  printSuccess,
  printWarning,
  strEqual,
} = require('core/util');
const { validateTxPromise } = require('core/tx');
const {
  checkStartError,
  readChainConfigFromEnv,
  updateChainConfig,
  updateReleaseYaml,
} = require('core/forge-fs');
const {
  getChainVersion,
  listReleases,
  getLocalVersions,
  getChainGraphQLHost,
} = require('core/libs/common');
const { isForgeStartedByStarter } = require('core/forge-process');
const debug = require('core/debug')('upgrade');
const { ensureModerator } = require('core/moderator');
const forgeVersion = require('core/forge-version');

const { ASSETS_PATH, DEFAULT_MIRROR } = require('../../../constant');
const { stop, waitUntilStopped } = require('../stop/stop');
const { printVersion } = require('../../misc/version/version');
const { createAsset, download, DOWNLOAD_FLAGS } = require('../../release/download/libs/index');

function isStoppedToUpgrade(chainName) {
  return new Promise(resolve => {
    const startTime = Date.now();
    const timer = setInterval(async () => {
      const err = await checkStartError(chainName, startTime);

      if (err) {
        clearInterval(timer);

        if (strEqual(err.status, 'version_mismatch') || strEqual(err.status, 'stop_for_upgrade')) {
          return resolve(true);
        }

        return resolve(`${err.status}: ${err.message}`);
      }

      return null;
    }, 800);
  });
}

const execExceptionOnError = failedMessage => (...args) => {
  const { code, stderr } = shell.exec(...args);
  if (code !== 0) {
    throw new Error(`${failedMessage}: ${stderr}, exit code: ${code}`);
  }
};

const startChain = chainName => {
  execExceptionOnError('start forge failed')(`forge start ${chainName} --color always`);
};

const useNewVersion = (chainName, version) => {
  const { name } = readChainConfigFromEnv();
  if (name === chainName) {
    updateReleaseYaml('forge', version);
  } else {
    updateChainConfig(chainName, { version });
  }
};

const readUpgradeAtHeight = async info => {
  const { height } = await inquirer.prompt({
    type: 'number',
    name: 'height',
    message: `Block height to perform the upgrade (latest ${info.blockHeight})?`,
    default: info.blockHeight + 20,
    validate: v => {
      if (!Number(v)) {
        return 'Block height must be number';
      }

      if (Number(v) <= info.blockHeight) {
        return `Block height must be greater than ${info.blockHeight}`;
      }

      return true;
    },
  });

  return height;
};

const readUpgradeVersion = async ({ currentVersion, releases }) => {
  const answers = await inquirer.prompt({
    type: 'list',
    name: 'version',
    message: 'To which version your want to upgrade?',
    default: '',
    choices: releases,
    validate: v => {
      if (!v) {
        return 'Target version can not be empty';
      }

      if (!semver.valid(v)) {
        return 'Target version must be valid version';
      }

      if (forgeVersion.gt(v, config.get('cli.version'))) {
        return `Target version must be greater than version ${currentVersion}`;
      }

      return true;
    },
  });
  return answers;
};

const confirmUpgrade = async message => {
  const { confirm } = await inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message,
    default: false,
  });

  return confirm;
};

const getReleases = async (currentVersion, mirror) => {
  let releases = [];
  try {
    releases = await fetchAsset(ASSETS_PATH.VERSIONS, mirror);
  } catch (error) {
    printWarning('Fetch remote releases failed:', error.message);
  }

  if (releases.length === 0) {
    releases = await listReleases();
  }

  return releases.map(({ version }) => version);
};

const getAvailableUpgradeReleases = (releases = [], currentVersion) => {
  const minVersion = semver.coerce(currentVersion).version;
  // eslint-disable-next-line
  const filteredReleases = releases.filter(version => {
    // TODO: does not support strict upgrade rule temporarily
    // const nextMinorVersion = semver.inc(currentVersion, 'minor');
    // forgeVersion.lte(version, nextMinorVersion)

    return semver.neq(version, currentVersion) && forgeVersion.gte(version, minVersion);
  });

  return filteredReleases.sort((v1, v2) => {
    if (forgeVersion.gt(v2, v1)) {
      return 1;
    }

    if (forgeVersion.lt(v2, v1)) {
      return -1;
    }

    return 0;
  });
};

const shouldSendUpgradeTx = (fromVersion, toVersion) => {
  if (
    !forgeVersion.isForgePatchVersion(fromVersion) &&
    !forgeVersion.isForgePatchVersion(toVersion)
  ) {
    return true;
  }

  if (semver.eq(semver.coerce(fromVersion).version, semver.coerce(toVersion).version)) {
    return false;
  }

  return true;
};

const upgradeNode = async ({ chainName, height, rpcClient: client, version }) => {
  const { info: currentChainInfo } = await client.getChainInfo();
  if (height <= currentChainInfo.blockHeight) {
    printError(`Block height must be greater than current height(${currentChainInfo.blockHeight})`);
    process.exit(1);
  }

  const currentVersion = getChainVersion(chainName);
  const moderator = await ensureModerator(client, {
    currentVersion,
  });

  if (!moderator) {
    return;
  }

  const hash = await client.sendUpgradeNodeTx({
    tx: {
      itx: { version, height },
    },
    wallet: moderator,
  });

  printSuccess('Upgrade node transaction sent');
  print(hr);

  const txSpinner = getSpinner('Waiting for transaction commit...');
  try {
    txSpinner.start();
    const validateResult = await validateTxPromise({
      chainHost: getChainGraphQLHost(config),
      hash,
      chainId: config.get('tendermint.genesis.chain_id'),
    });
    txSpinner.succeed(`Transaction ${hash} committed successfully:`);
    print(pretty(validateResult));
  } catch (error) {
    if (strEqual(error.type, 'exception')) {
      txSpinner.warn(`Query transaction ${hash} failed:`);
      print(pretty(error, { stringColor: 'yellow', keysColor: 'yellow', dashColor: 'yellow' }));
    } else {
      throw error;
    }
  }

  const spinner = getSpinner('Stopping forge...');
  spinner.start();
  debug('waiting forge stop');

  if (await isForgeStartedByStarter(chainName)) {
    const forgeStopInfo = await isStoppedToUpgrade(chainName);
    if (forgeStopInfo !== true) {
      printError(forgeStopInfo);
      process.exit(1);
    }

    spinner.stop();
    await stop(chainName, true);
    debug('forge stopped');
    spinner.succeed('Forge stopped');
  } else {
    await waitUntilStopped(chainName);
    spinner.stop();
    await stop(chainName, false);
    debug('forge stopped');
    spinner.succeed('Forge stopped');
  }
};

const downloadIfRequires = async (version, mirror) => {
  const localReleases = await getLocalVersions();
  if (!localReleases.find(v => semver.eq(v, version))) {
    const platform = await getPlatform();

    const asset = createAsset({
      version,
      mirror,
      platform,
    });

    const downloadResult = await download(asset);
    if (downloadResult !== DOWNLOAD_FLAGS.SUCCESS) {
      throw new Error(`download v${version} failed`);
    }
  }
};

async function main({
  args: [chainName = process.env.FORGE_CURRENT_CHAIN],
  opts: { mirror = DEFAULT_MIRROR },
}) {
  try {
    const client = createRpcClient();
    const currentVersion = config.get('cli.currentVersion');
    const releases = getAvailableUpgradeReleases(await getReleases(), currentVersion);

    if (!releases.length) {
      printSuccess('Abort because no available newer version to upgrade!');
      printInfo(`Run ${chalk.cyan('forge download')} to install a new version.`);
      process.exit(0);
    }

    let { version } = await readUpgradeVersion({
      currentVersion,
      releases,
    });

    version = semver.clean(version);

    if (shouldSendUpgradeTx(currentVersion, version)) {
      const { info } = await client.getChainInfo();
      const height = await readUpgradeAtHeight(info);

      const confirm = await confirmUpgrade(
        `Will upgrade node from v${chalk.cyan(currentVersion)} to v${chalk.cyan(
          version
        )} at height ${chalk.cyan(height)}, and this cannot be undo, are your sure?`
      );

      if (!confirm) {
        printError('Abort because user cancellation!');
        process.exit(0);
      }

      await downloadIfRequires(version, mirror);
      await upgradeNode({ chainName, height, rpcClient: client, version });
    } else {
      const confirm = await confirmUpgrade('Confirm to upgrade?');
      if (!confirm) {
        printError('Abort because user cancellation!');
        process.exit(0);
      }

      await downloadIfRequires(version, mirror);
      await stop(chainName);
    }

    useNewVersion(chainName, version);
    startChain(chainName);

    await printVersion(chainName);
    printSuccess('Upgrade success!');

    process.exit(0);
  } catch (error) {
    printError('Upgrade failed!');
    printError(error);
    process.exit(1);
  }
}

exports.run = main;
exports.execute = main;
