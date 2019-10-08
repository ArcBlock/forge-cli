const inquirer = require('inquirer');
const semver = require('semver');
const shell = require('shelljs');
const chalk = require('chalk');

const { config, createRpcClient } = require('core/env');
const { hr, getSpinner } = require('core/ui');
const {
  sleep,
  parseTimeStrToMS,
  print,
  printError,
  printInfo,
  printSuccess,
  strEqual,
} = require('core/util');
const {
  checkStartError,
  listReleases,
  readChainConfigFromEnv,
  updateChainConfig,
  updateReleaseYaml,
} = require('core/forge-fs');
const { isForgeStartedByStarter } = require('core/forge-process');
const debug = require('core/debug')('upgrade');
const { ensureModerator } = require('core/moderator');

const { stop, waitUntilStopped } = require('../stop/stop');

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

    const moderator = await ensureModerator(client);
    if (!moderator) {
      return;
    }

    const { info } = await client.getChainInfo();
    const configs = await getConfigs({ info, currentVersion: current, releases });
    if (!configs.confirm) {
      printError('Abort because user cancellation!');
      process.exit(0);
    }

    const hash = await client.sendUpgradeNodeTx({
      tx: {
        itx: configs,
      },
      wallet: moderator,
    });

    printSuccess('Upgrade node transaction sent');
    print(hr);

    const txSpinner = getSpinner('Waiting for transaction commit...');
    txSpinner.start();
    const waitMS = 1000 + parseTimeStrToMS(config.get('tendermint.timeoutCommit', '5s'));
    await sleep(waitMS);
    txSpinner.stop();

    execExceptionOnError(`send tx ${hash} failed`)(`forge tx ${hash} -c ${chainName}`);

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

    useNewVersion(chainName, configs.version);

    printInfo('Version:');
    execExceptionOnError()(`forge version -c ${chainName} --color always`);
    print();
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
