/* eslint-disable consistent-return */
const chalk = require('chalk');
const fs = require('fs');
const shell = require('shelljs');

const { symbols, hr, getSpinner } = require('core/ui');
const { config, debug } = require('core/env');
const { getLogfile } = require('core/forge-fs');
const { sleep } = require('core/util');
const { isForgeStarted, getProcessTag } = require('core/forge-process');

const { start: startWeb } = require('../web/web');
const { run: stop } = require('../stop/stop');

function checkError(startAtMs) {
  return new Promise(resolve => {
    const errorFilePath = getLogfile('exit_status.json');

    fs.stat(errorFilePath, (err, stats) => {
      if (!err && stats.ctimeMs > startAtMs) {
        const { status, message } = JSON.parse(fs.readFileSync(errorFilePath).toString());
        return resolve(`${status}: ${message}`);
      }

      resolve(null);
    });
  });
}

async function main({ opts: { dryRun } }) {
  const startAt = Date.now();
  if (await isForgeStarted()) {
    shell.echo(`${symbols.info} forge is already started!`);
    shell.echo(`${symbols.info} Please run ${chalk.cyan('forge stop')} first!`);
    return;
  }

  const { starterBinPath, forgeBinPath, forgeConfigPath } = config.get('cli');
  if (!starterBinPath) {
    shell.echo(`${symbols.error} starterBinPath not found, abort!`);
    return;
  }

  // add `-sname` parameter to enable start multiple forge processes
  const command = `ERL_AFLAGS="-sname ${getProcessTag(
    'main'
  )}" FORGE_CONFIG=${forgeConfigPath} ${forgeBinPath} daemon`;

  debug('start command', command);

  if (dryRun) {
    shell.echo(`${symbols.info} Command to debug forge starting issue: `);
    shell.echo(hr);
    shell.echo(chalk.cyan(command));
    shell.echo(hr);
    const url = 'https://github.com/ArcBlock/forge-cli/issues';
    shell.echo(
      `${symbols.info} Please create an issue on ${chalk.cyan(
        url
      )} with output after running above command`
    );
    return;
  }

  const spinner = getSpinner('Waiting for forge daemon to start...');
  spinner.start();
  try {
    shell.exec(command);
    await waitUntilStarted(40000);
    await sleep(6000);
    const errMessage = await checkError(startAt);
    if (errMessage) {
      throw new Error(errMessage);
    }

    if (config.get('forge.web.enabled')) {
      spinner.stop();
      await startWeb();
      spinner.start();
    }

    spinner.succeed('Forge daemon successfully started');
    shell.exec('forge ps');
    shell.echo('');
    shell.echo(
      `${symbols.info} If you want to access interactive console, please run ${chalk.cyan(
        `${forgeBinPath} remote`
      )}`
    );
    shell.echo(
      `${symbols.info} If you want to access forge web interface, please run ${chalk.cyan(
        'forge web open'
      )}`
    );
    shell.echo(
      `${symbols.info} If you want to show above process list, please run ${chalk.cyan('forge ps')}`
    );
    shell.echo(
      `${symbols.info} If you want to know forge status detail, please run ${chalk.cyan(
        'forge status'
      )}`
    );
  } catch (err) {
    debug.error(err);
    shell.echo();
    shell.echo(`${symbols.error} Forge start failed: ${err.message}`);

    spinner.fail('Forge cannot be successfully started, now exiting...');

    await stop({ opts: { force: true } });

    shell.echo();
    shell.echo(`${symbols.info} Possible solutions:`);
    shell.echo(hr);
    shell.echo('1. Cleanup already running forge');
    shell.echo('Ensure no running forge process that cannot be detected by forge-cli');
    shell.echo(
      `Run: ${chalk.cyan(
        'forge stop --force'
      )}, to kill forge related processes, then try ${chalk.cyan('forge start')} again`
    );
    shell.echo('');
    shell.echo('2. Report bug to our engineer');
    shell.echo('It is very likely that forge cannot be started on your environment');
    shell.echo(`Please run: ${chalk.cyan('forge start --dry-run')}`);
  }
}

function waitUntilStarted(timeout = 30000) {
  return new Promise(async (resolve, reject) => {
    if (await isForgeStarted()) {
      return resolve();
    }

    let timeElapsed = 0;
    const interval = 800;
    const timer = setInterval(async () => {
      if (await isForgeStarted()) {
        clearInterval(timer);
        return resolve();
      }

      if (timeElapsed > timeout) {
        clearInterval(timer);
        reject(new Error(`forge is not started within ${timeout / 1000} seconds`));
      }

      timeElapsed += interval;
    }, interval);
  });
}

exports.execute = main;
exports.run = main;
