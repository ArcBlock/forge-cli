const inquirer = require('inquirer');
const semver = require('semver');
const shell = require('shelljs');
const chalk = require('chalk');

const { config, createRpcClient } = require('core/env');
const { hr, getSpinner } = require('core/ui');
const { print, printError, printInfo, printSuccess } = require('core/util');
const { sleep, parseTimeStrToMS, strEqual } = require('core/util');
const { checkStartError } = require('core/forge-fs');
const { isForgeStartedByStarter } = require('core/forge-process');
const debug = require('core/debug')('upgrade');

const { stop, waitUntilStopped } = require('../stop/stop');
const { ensureModerator } = require('../../protocol/deploy/deploy');
const { listReleases } = require('../../release/list/list');

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

async function main({ args: [chainName = process.env.FORGE_CURRENT_CHAIN] }) {
  const client = createRpcClient();
  const current = config.get('cli.currentVersion');
  const releases = listReleases()
    .forge.filter(x => semver.gt(x, current))
    .sort((v1, v2) => semver.gt(v2, v1));

  if (!releases.length) {
    printError('Abort because no available newer version to upgrade!');
    printInfo(`run ${chalk.cyan('forge download')} to install a new version`);
    process.exit(1);
    return;
  }

  const moderator = await ensureModerator(client);
  if (!moderator) {
    return;
  }

  const { info } = await client.getChainInfo();
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
          return `Target version must be greater than version ${current}`;
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
        `Will upgrade node from v${chalk.cyan(current)} to v${chalk.cyan(
          answers.version
        )} at height ${chalk.cyan(answers.height)}, and this cannot be undo, are your sure?`,
      default: false,
    },
  ];

  const answers = await inquirer.prompt(questions);
  if (!answers.confirm) {
    printError('Abort because user cancellation!');
    process.exit(0);
  }

  const hash = await client.sendUpgradeNodeTx({
    tx: {
      itx: answers,
    },
    wallet: moderator,
  });

  printSuccess('upgrade node transaction sent');
  print(hr);

  const txSpinner = getSpinner('Waiting for transaction commit...');
  txSpinner.start();
  const waitMS = 1000 + parseTimeStrToMS(config.get('tendermint.timeoutCommit', '5s'));
  await sleep(waitMS);
  txSpinner.stop();

  shell.exec(`forge tx ${hash} -c ${chainName}`);

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
    spinner.succeed('Forge stopped');
  } else {
    await waitUntilStopped(chainName);
    await stop(chainName, false);
    debug('forge stopped');
    spinner.succeed('Forge stopped');
  }

  shell.exec(`forge use ${answers.version} -c ${chainName} --color always`);
  // We need to stop forge-web here, because when forge crashed, forge-web is still alive
  shell.exec(`forge web stop -c ${chainName} --color always`, { silent: true });
  shell.exec(`forge start ${chainName} --color always`);

  print();
  printInfo('Version:');
  shell.exec(`forge version -c ${chainName}`);
  print();
  printSuccess('Upgrade success!');

  process.exit(0);
}

exports.run = main;
exports.execute = main;
