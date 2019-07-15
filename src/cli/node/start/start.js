/* eslint-disable consistent-return */
const fs = require('fs');
const shell = require('shelljs');
const chalk = require('chalk');
const findProcess = require('find-process');
const { symbols, hr, getSpinner } = require('core/ui');

const { config, debug, sleep } = require('core/env');
const { start } = require('../web/web');

function getForgeReleaseEnv() {
  if (process.env.FORGE_RELEASE && fs.existsSync(process.env.FORGE_RELEASE)) {
    return process.env.FORGE_RELEASE;
  }

  return config.get('cli.forgeReleaseDir');
}

async function isStarted(silent = false) {
  try {
    const tendermintProcess = await findProcess('name', 'tendermint');
    if (tendermintProcess && tendermintProcess.length > 0) {
      debug('node.start.isStarted', { tendermintProcess });
      if (silent === false) {
        shell.echo(`${symbols.info} forge is already started!`);
        shell.echo(`${symbols.info} Please run ${chalk.cyan('forge stop')} first!`);
      }

      return true;
    }
  } catch (error) {
    debug('node.start.isStarted', error.message);
  }

  return false;
}

async function main({ opts: { multiple, dryRun } }) {
  if (multiple && !process.env.FORGE_CONFIG) {
    shell.echo(`${symbols.error} start multiple chain requires provided custom config`);
    return;
  }

  if (!multiple && (await isStarted())) {
    return;
  }

  const { starterBinPath, forgeBinPath, forgeConfigPath } = config.get('cli');
  if (!starterBinPath) {
    shell.echo(`${symbols.error} starterBinPath not found, abort!`);
    return;
  }

  const command = `FORGE_CONFIG=${forgeConfigPath} FORGE_RELEASE=${getForgeReleaseEnv()} ${starterBinPath} daemon`;
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
    if (config.get('forge.web.enabled')) {
      spinner.stop();
      await start();
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
    spinner.fail('Error: forge cannot be successfully started');
    shell.echo('');
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
    if (await isStarted(true)) {
      return resolve();
    }

    let timeElapsed = 0;
    const interval = 800;
    const timer = setInterval(async () => {
      if (await isStarted(true)) {
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
