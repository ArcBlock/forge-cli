/* eslint-disable consistent-return */
const shell = require('shelljs');
const chalk = require('chalk');
const { symbols, getSpinner } = require('core/ui');
const debug = require('core/debug')('stop');

const { isForgeStarted, stopServices, getRunningProcesses } = require('core/forge-process');

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

async function main({ opts: { force } }) {
  try {
    if (force) {
      shell.echo(`${symbols.warning} ${chalk.yellow('Stop all forge processes in force mode')}`);
      // prettier-ignore
      // eslint-disable-next-line
      const command = `ps -ef | grep -v grep | grep -v ${process.pid} | grep -v stop | grep forge | awk '{print $2}' | xargs kill`;
      shell.exec(command, { silent: true });
      shell.echo(chalk.cyan(command));
      shell.echo(`${symbols.info} It may take up to 10 seconds for all forge processes to stop`);
      return;
    }

    shell.echo(`${symbols.success} Stoping forge...`);

    const spinner = getSpinner('Waiting for forge to stop...');

    const runningProcesses = await getRunningProcesses();
    debug(`running processes ${runningProcesses.map(x => x.pid)}`);

    spinner.start();
    await stopServices(runningProcesses);
    await waitUntilStopped();

    spinner.succeed('Forge daemon stopped!');

    process.exit(0);
  } catch (err) {
    shell.echo();
    debug(err.message);
    shell.echo(`${symbols.error} cannot get daemon process info, ensure forge is started!`);
    process.exit(1);
  }
}

exports.run = main;
exports.execute = main;
