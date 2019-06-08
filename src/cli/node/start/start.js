/* eslint-disable consistent-return */
const fs = require('fs');
const shell = require('shelljs');
const chalk = require('chalk');
const { symbols, getSpinner } = require('core/ui');
const { config, debug, sleep, runNativeWebCommand } = require('core/env');

const startForgeWeb = runNativeWebCommand('start', { silent: true });

function getForgeReleaseEnv() {
  if (process.env.FORGE_RELEASE && fs.existsSync(process.env.FORGE_RELEASE)) {
    return process.env.FORGE_RELEASE;
  }

  return config.get('cli.forgeReleaseDir');
}

function isStarted(silent = false) {
  const { starterBinPath, forgeConfigPath } = config.get('cli');
  const { stdout: pid } = shell.exec(
    `FORGE_CONFIG=${forgeConfigPath} FORGE_RELEASE=${getForgeReleaseEnv()} ${starterBinPath} pid`,
    {
      silent: true,
    }
  );

  const pidNumber = Number(pid);
  debug('node.start.isStarted', { pidNumber, pid });
  if (pidNumber) {
    if (silent === false) {
      shell.echo(`${symbols.info} forge is already started!`);
      shell.echo(`${symbols.info} Please run ${chalk.cyan('forge stop')} first!`);
    }
    return true;
  }

  return false;
}

async function main({ opts: { multiple } }) {
  if (multiple && !process.env.FORGE_CONFIG) {
    shell.echo(`${symbols.error} start multiple chain requires provided custom config`);
    return;
  }

  if (!multiple && isStarted()) {
    return;
  }

  const { starterBinPath, forgeBinPath, forgeConfigPath } = config.get('cli');
  if (!starterBinPath) {
    shell.echo(`${symbols.error} starterBinPath not found, abort!`);
    return;
  }

  const command = `FORGE_CONFIG=${forgeConfigPath} FORGE_RELEASE=${getForgeReleaseEnv()} ${starterBinPath} start`;
  debug('start command', command);

  const spinner = getSpinner('Waiting for forge daemon to start...');
  spinner.start();
  shell.exec(command);
  await waitUntilStarted();
  await sleep(4000);
  if (config.get('forge.web.enabled')) {
    await startForgeWeb();
  }
  spinner.succeed('Forge daemon successfully started');
  shell.exec('forge ps');
  shell.echo('');
  shell.echo(
    `${symbols.info} If you want to access interactive console, please run ${chalk.cyan(
      `${forgeBinPath} remote_console`
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
}

function waitUntilStarted() {
  return new Promise(resolve => {
    if (isStarted(true)) {
      return resolve();
    }

    const timer = setInterval(() => {
      if (isStarted(true)) {
        clearInterval(timer);
        return resolve();
      }
    }, 800);
  });
}

exports.execute = main;
exports.run = main;
