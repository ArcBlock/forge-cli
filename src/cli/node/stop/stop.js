/* eslint-disable consistent-return */
const chalk = require('chalk');
const deprecated = require('depd')('@arcblock/cli');
const shell = require('shelljs');
const { printSuccess, printWarning } = require('core/util');
const { symbols, getSpinner } = require('core/ui');
const debug = require('core/debug')('stop');

const {
  getAllRunningProcesses,
  isForgeStarted,
  stopForgeProcesses,
  stopAllForgeProcesses,
} = require('core/forge-process');

function waitUntilStopped() {
  return new Promise(async resolve => {
    if (!(await isForgeStarted())) {
      return resolve();
    }

    const timer = setInterval(async () => {
      if (!(await isForgeStarted())) {
        clearInterval(timer);
        return resolve();
      }
    }, 800);
  });
}

async function main({ opts: { force, all }, args: [chainName = process.env.PROFILE_NAME] }) {
  try {
    if (force) {
      deprecated('forge stop --force: Use forge stop --all instead');
    }

    const allProcesses = await getAllRunningProcesses();
    if (!allProcesses || !allProcesses.length) {
      printWarning('No running processes');
      process.exit(0);
    }

    debug(`all processes ${allProcesses.map(x => x.pid)}`);

    let handle = null;
    const spinner = getSpinner('Waiting for forge to stop...');
    if (force || all) {
      printWarning(chalk.yellow('Stopping all chains'));
      handle = stopAllForgeProcesses;
    } else {
      printSuccess(`Stoping ${chalk.yellow(chainName)} chain...`);
      handle = stopForgeProcesses.bind(null, chainName);
    }

    spinner.start();
    const stoppedProcesses = await handle();

    debug(`stopped processes ${stoppedProcesses.map(x => x.pid)}`);

    await waitUntilStopped();
    spinner.succeed('Forge daemon stopped!');

    process.exit(0);
  } catch (err) {
    shell.echo();
    debug(err);
    shell.echo(`${symbols.error} cannot get daemon process info, ensure forge is started!`);
    process.exit(1);
  }
}

exports.run = main;
exports.execute = main;
