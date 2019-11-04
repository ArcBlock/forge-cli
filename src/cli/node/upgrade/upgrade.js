const inquirer = require('inquirer');
const semver = require('semver');
const shell = require('shelljs');
const chalk = require('chalk');

const { config, createRpcClient } = require('core/env');
const { hr, getSpinner, pretty } = require('core/ui');
const { print, printError, printInfo, printSuccess, strEqual } = require('core/util');
const { validateTxPromise } = require('core/tx');
const {
  checkStartError,
  listReleases,
  readChainConfigFromEnv,
  updateChainConfig,
  updateReleaseYaml,
} = require('core/forge-fs');
const { getChainVersion, getChainGraphQLHost } = require('core/libs/common');
const { isForgeStartedByStarter } = require('core/forge-process');
const debug = require('core/debug')('upgrade');
const { ensureModerator } = require('core/moderator');

const { stop, waitUntilStopped } = require('../stop/stop');
const { printVersion } = require('../../misc/version/version.js');

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

const useNewVersion = (chainName, version) => {
  const { name } = readChainConfigFromEnv();
  if (name === chainName) {
    updateReleaseYaml('forge', version);
  } else {
    updateChainConfig(chainName, { version });
  }

  execExceptionOnError('stop web failed')(`forge web stop -c ${chainName} --color always`);
  execExceptionOnError('start forge failed')(`forge start ${chainName} --color always`);
};

const getConfigs = async ({ currentVersion, info, releases }) => {
  const questions = [
    {
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

        if (semver.gt(v, config.get('cli.version'))) {
          return `Target version must be greater than version ${currentVersion}`;
        }

        return true;
      },
    },
    {
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
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: answers =>
        `Will upgrade node from v${chalk.cyan(currentVersion)} to v${chalk.cyan(
          answers.version
        )} at height ${chalk.cyan(answers.height)}, and this cannot be undo, are your sure?`,
      default: false,
    },
  ];

  const answers = await inquirer.prompt(questions);
  return answers;
};

async function main({ args: [chainName = process.env.FORGE_CURRENT_CHAIN] }) {
  try {
    const client = createRpcClient();
    const current = config.get('cli.currentVersion');
    const releases = (await listReleases())
      .filter(({ version }) => semver.gt(version, current))
      .sort((v1, v2) => semver.gt(v2.version, v1.version))
      .map(({ version }) => version);

    if (!releases.length) {
      printSuccess('Abort because no available newer version to upgrade!');
      printInfo(`Run ${chalk.cyan('forge download')} to install a new version.`);
      process.exit(0);
    }

    const currentVersion = getChainVersion(chainName);
    const moderator = await ensureModerator(client, {
      currentVersion,
    });
    if (!moderator) {
      return;
    }

    const { info } = await client.getChainInfo();
    const { version, height, confirm } = await getConfigs({
      info,
      currentVersion: current,
      releases,
    });
    if (!confirm) {
      printError('Abort because user cancellation!');
      process.exit(0);
    }

    const { info: currentChainInfo } = await client.getChainInfo();
    if (height <= currentChainInfo.blockHeight) {
      printError(
        `Block height must be greater than current height(${currentChainInfo.blockHeight})`
      );
      process.exit(1);
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

    useNewVersion(chainName, version);

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
