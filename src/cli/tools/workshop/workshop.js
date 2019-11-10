/* eslint no-case-declarations:"off" */
const chalk = require('chalk');
const semver = require('semver');
const shell = require('shelljs');
const { print, printInfo, printWarning, sleep } = require('core/util');
const { config, makeNativeCommandRunner } = require('core/env');
const { getChainReleaseFilePath } = require('core/forge-fs');
const { getForgeWorkshopProcess } = require('core/forge-process');
const { getSpinner, pretty } = require('core/ui');
const { DEFAULT_WORKSHOP_PORT } = require('../../../constant');

const MULTI_WORKSHOP_VERSION = '0.36.4';

const isWorkshopStarted = async chainName => {
  const { pid } = await getForgeWorkshopProcess(chainName);
  return pid > 0;
};

function processOutput(output, action) {
  if (/:error/.test(output)) {
    throw new Error(`Forge Workshop ${action} failed: ${output.trim()}`);
  }
}

function checkForgeVersion(version) {
  if (semver.lt(version, MULTI_WORKSHOP_VERSION)) {
    printWarning(
      `Start multiple Workshop can only be above v${MULTI_WORKSHOP_VERSION} of forge,
      otherwise, Workshop can be only start once at port 8807.`
    );

    return false;
  }

  return true;
}

const waitWorkshopStarted = async (chainName, waitMillionseconds = 10 * 1000) => {
  await sleep(waitMillionseconds);
  return isWorkshopStarted(chainName);
};

async function main({ args: [action = 'none'], opts: { chainName } }) {
  const { pid } = await getForgeWorkshopProcess(chainName);

  const configPath = getChainReleaseFilePath(process.env.FORGE_CURRENT_CHAIN);
  const startWorkshop = makeNativeCommandRunner('workshopBinPath', 'workshop', {
    env: `WORKSHOP_CONFIG=${configPath} FORGE_WORKSHOP_CONFIG=${configPath}`,
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
    case 'start':
      if (pid) {
        printInfo('Forge Workshop already started');
        process.exit(0);
        return;
      }

      print('Workshop will run with configs:');
      print(pretty(config.get('workshop')));
      print(
        `If you want to customize them, just edit the [workshop] group in config file: ${chalk.cyan(
          configPath
        )}`
      );
      print('Then restart Forge Workshop.');
      print();

      const spinner = getSpinner('Waiting for Workshop start...');
      spinner.start();
      const { stdout, stderr } = startWorkshop();
      processOutput(stdout || stderr, action);
      const isStarted = await waitWorkshopStarted(chainName);
      if (!isStarted) {
        spinner.fail('Start Forge Workshop failed.');
        process.exit(-1);
      }

      spinner.succeed();
      printInfo(`Forge Workshop running at: ${workshopUrl}`);
      break;
    case 'stop':
      if (!pid) {
        printInfo('Forge Workshop not started yet');
        process.exit(1);
        return;
      }
      printInfo('Stopping Forge Workshop...');
      shell.exec(`kill ${pid}`);
      break;
    case 'open':
      if (!pid) {
        printInfo('Forge Workshop not started yet');
        await main({ args: ['start'] });
        await sleep(2000);
      }
      printInfo(`Opening ${workshopUrl}...`);
      shell.exec(`open ${workshopUrl}`);
      break;
    default:
      shell.exec('forge workshop -h --color always');
      break;
  }
  /* eslint-enable indent */
}

exports.run = main;
exports.execute = main;
