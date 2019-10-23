/* eslint no-case-declarations:"off" */
const chalk = require('chalk');
const semver = require('semver');
const shell = require('shelljs');
const { print, printError, printInfo, printSuccess, printWarning, sleep } = require('core/util');
const { config, makeNativeCommandRunner } = require('core/env');
const { getChainReleaseFilePath } = require('core/forge-fs');
const { getForgeWorkshopProcess } = require('core/forge-process');
const { pretty } = require('core/ui');
const { DEFAULT_WORKSHOP_PORT } = require('../../../constant');

const MULTI_WORKSHOP_VERSION = '0.36.4';

function processOutput(output, action) {
  if (/:error/.test(output)) {
    if (/:already_started/.test(output)) {
      printWarning('forge workshop already started');
    } else {
      printError(`forge workshop ${action} failed: ${output.trim()}`);
    }
  } else {
    printSuccess(`forge workshop ${action} success!`);
  }
}

function checkForgeVersion(version) {
  if (semver.lt(version, MULTI_WORKSHOP_VERSION)) {
    printWarning(
      `Start multiple workshop can only be above v${MULTI_WORKSHOP_VERSION} of forge,
      otherwise, workshop can be only start once at port 8807.`
    );

    return false;
  }

  return true;
}

async function main({ args: [action = 'none'] }) {
  const { pid } = await getForgeWorkshopProcess();

  const configPath = getChainReleaseFilePath(process.env.FORGE_CURRENT_CHAIN);
  const startWorkshop = makeNativeCommandRunner('workshopBinPath', 'workshop', {
    env: `WORKSHOP_CONFIG=${configPath}`,
  })('daemon', { silent: true });

  let port = config.get('workshop.port') || DEFAULT_WORKSHOP_PORT;
  const host = config.get('workshop.host') || '127.0.0.1';
  const res = checkForgeVersion(config.get('cli.currentVersion'));
  if (!res) {
    port = '8807';
  }
  const workshopUrl = `http://${host}:${port}`;

  /* eslint-disable indent */
  switch (action) {
    case 'none':
      print('forge workshop -h --color always');
      break;
    case 'start':
      if (pid) {
        printInfo('forge workshop already started');
        process.exit(0);
        return;
      }

      print('Workshop will run with configs:');
      print(pretty(config.get('workshop')));
      print('If you want to customize them, just edit the [workshop] group in config file:');
      print(chalk.cyan(configPath));
      print('Then restart workshop.');
      print();
      const { stdout, stderr } = startWorkshop();
      processOutput(stdout || stderr, action);
      printInfo(`forge workshop running at: ${workshopUrl}`);
      break;
    case 'stop':
      if (!pid) {
        printInfo('forge web not started yet');
        process.exit(1);
        return;
      }
      print('Stopping forge workshop...');
      shell.exec(`kill ${pid}`);
      break;
    case 'open':
      if (!pid) {
        printInfo('forge workshop not started yet');
        await main({ args: ['start'] });
        await sleep(2000);
      }
      print(`Opening ${workshopUrl}...`);
      shell.exec(`open ${workshopUrl}`);
      break;
    default:
      break;
  }
  /* eslint-enable indent */
}

exports.run = main;
exports.execute = main;
