/* eslint-disable consistent-return */
const chalk = require('chalk');
const deprecated = require('depd')('@arcblock/cli');
const shell = require('shelljs');
const { printError, printInfo, printWarning } = require('core/util');
const { symbols, getSpinner } = require('core/ui');
const debug = require('core/debug')('stop');

const {
  isForgeStarted,
  getRunningProcesses,
  getAllProcesses,
  stopForgeProcesses,
  stopAllForgeProcesses,
} = require('core/forge-process');

function waitUntilStopped(chainName) {
  return new Promise(async resolve => {
    if (!(await isForgeStarted(chainName))) {
      return resolve();
    }

    const timer = setInterval(async () => {
      if (!(await isForgeStarted(chainName))) {
        clearInterval(timer);
        return resolve();
      }
    }, 800);
  });
}

async function stop(chainName, all = false) {
  try {
    if (all) {
      printWarning(chalk.yellow('Stopping all chains'));
      const spinner = getSpinner('Waiting for all chains to stop...');
      spinner.start();

      const handle = stopAllForgeProcesses;
      const stoppedProcesses = await handle();
      debug(`stopped processes ${stoppedProcesses.map(x => x.pid)}`);

      await waitUntilStopped(chainName);
      spinner.succeed('All Chains are stopped!');
    } else {
      printInfo(`Stopping ${chalk.yellow(chainName)} chain...`);
      const spinner = getSpinner(`Waiting for chain ${chalk.yellow(chainName)} to stop...`);
      spinner.start();

      const runningChains = await getAllProcesses();
      let handle = null;
      if (runningChains.length === 1) {
        debug('stop all processes');
        handle = stopAllForgeProcesses;
      } else {
        handle = stopForgeProcesses.bind(null, chainName);
      }

      const stoppedProcesses = await handle();

      debug(`stopped processes ${stoppedProcesses.map(x => x.pid)}`);
      await waitUntilStopped(chainName);

      spinner.succeed(`Chain ${chalk.yellow(chainName)} stopped!`);
    }

    return true;
  } catch (err) {
    shell.echo();
    printError(err);
    shell.echo(`${symbols.error} cannot get daemon process info, ensure forge is started!`);
    return false;
  }
}

async function main({ opts: { force, all }, args: [chainName = process.env.FORGE_CURRENT_CHAIN] }) {
  if (force) {
    deprecated('forge stop --force: Use forge stop --all instead');
  }

  if (!all) {
    const processes = await getRunningProcesses(chainName);
    if (processes.length === 0) {
      printWarning(`${chalk.cyan(chainName)} is not started!`);
      process.exit(1);
    }
  }

  const tmp = await stop(chainName, force || all);
  process.exit(tmp ? 0 : 1);
}

exports.run = main;
exports.execute = main;
exports.stop = stop;
exports.waitUntilStopped = waitUntilStopped;
