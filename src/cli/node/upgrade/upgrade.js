const inquirer = require('inquirer');
const semver = require('semver');
const shell = require('shelljs');
const chalk = require('chalk');
const { config, createRpcClient } = require('core/env');
const { symbols, hr, getSpinner } = require('core/ui');

const { sleep, parseTimeStrToMS } = require('core/util');
const { ensureModerator } = require('../../protocol/deploy/deploy');
const { listReleases } = require('../../release/list/list');

async function main() {
  const client = createRpcClient();
  const current = config.get('cli.currentVersion');
  const releases = listReleases()
    .forge.filter(x => semver.gt(x, current))
    .sort((v1, v2) => semver.gt(v2, v1));

  if (!releases.length) {
    shell.echo(`${symbols.error} Abort because no available newer version to upgrade!`);
    shell.echo(`${symbols.info} run ${chalk.cyan('forge download')} to install a new version`);
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
    shell.echo(`${symbols.error} Abort because user cancellation!`);
    process.exit(0);
  }

  const hash = await client.sendUpgradeNodeTx({
    tx: {
      itx: answers,
    },
    wallet: moderator,
  });

  shell.echo(`${symbols.success} upgrade node transaction sent`);
  shell.echo(hr);

  const spinner = getSpinner('Waiting for transaction is done...');
  spinner.start();
  const waitMS = 1000 + parseTimeStrToMS(config.get('tendermint.timeoutCommit', '5s'));
  await sleep(waitMS);
  spinner.stop();
  shell.exec(`forge tx ${hash}`);

  shell.echo(hr);
  shell.echo(`${symbols.info} forge will stop at height ${answers.height}`);
  shell.echo(
    `${symbols.info} you need to run following commands in sequence to complete the upgrade:`
  );
  shell.echo(`1. stop forge daemon: ${chalk.cyan('forge stop')}`);
  shell.echo(`2. select new version in forge-cli: ${chalk.cyan(`forge use ${answers.version}`)}`);
  shell.echo(`3. start forge again: ${chalk.cyan('forge start')}`);
}

exports.run = main;
exports.execute = main;
