/* eslint-disable consistent-return */
const shell = require('shelljs');
const chalk = require('chalk');
const { symbols, getSpinner } = require('core/ui');
const { findServicePid, sleep } = require('core/env');

async function isStopped() {
  const pid = await findServicePid('forge_starter');
  return !pid;
}

function waitUntilStopped() {
  return new Promise(async resolve => {
    if (await isStopped(true)) {
      return resolve();
    }

    const timer = setInterval(async () => {
      if (await isStopped(true)) {
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
      const command = 'ps -ef | grep -v grep | grep -v stop | grep forge | awk \'{print $2}\' | xargs kill';
      shell.exec(command, { silent: true });
      shell.echo(chalk.cyan(command));
      shell.echo(`${symbols.info} It may take up to 10 seconds for all forge processes to stop`);
      return;
    }

    const pid = await findServicePid('forge_starter');
    if (!pid) {
      shell.echo(`${symbols.error} forge is not started yet!`);
      shell.echo(`${symbols.info} start with ${chalk.cyan('forge start')}!`);
      process.exit(1);
      return;
    }

    shell.echo(`${symbols.success} Sending kill signal to forge daemon...`);
    const spinner = getSpinner('Waiting for forge daemon to stop...');
    spinner.start();
    const { code, stderr } = shell.exec(`kill ${pid}`, { silent: true });
    if (code !== 0) {
      spinner.fail(`Forge daemon stop failed ${stderr}!`);
      return;
    }

    try {
      const simulatorPid = await findServicePid('simulator');
      if (simulatorPid) {
        shell.exec(`kill ${simulatorPid}`, { silent: true });
      }

      const workshopPid = await findServicePid('forge_workshop');
      if (workshopPid) {
        shell.exec(`kill ${workshopPid}`, { silent: true });
      }

      const webPid = await findServicePid('forge_web');
      if (webPid) {
        shell.exec(`kill ${webPid}`, { silent: true });
      }
    } catch (err) {
      // do nothing
    }
    await waitUntilStopped();
    await sleep(5000);
    spinner.succeed('Forge daemon stopped!');

    process.exit(0);
  } catch (err) {
    shell.echo(`${symbols.error} cannot get daemon process info, ensure forge is started!`);
    process.exit(1);
  }
}

exports.run = main;
exports.execute = main;
