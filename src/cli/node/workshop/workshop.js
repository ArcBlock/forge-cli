/* eslint no-case-declarations:"off" */
const shell = require('shelljs');
const { print, printError, printInfo, printSuccess, printWarning, sleep } = require('core/util');
const { config, runNativeWorkshopCommand } = require('core/env');
const { getForgeWorkshopProcess } = require('core/forge-process');
const { symbols } = require('core/ui');
const { DEFAULT_WORKSHOP_PORT } = require('../../../constant');

const startWorkshop = runNativeWorkshopCommand('daemon', { silent: true });

function processOutput(output, action) {
  if (/:error/.test(output)) {
    if (/:already_started/.test(output)) {
      printWarning('forge workshop already started');
    } else {
      printError(`${symbols.error} forge workshop ${action} failed: ${output.trim()}`);
    }
  } else {
    printSuccess(`forge workshop ${action} success!`);
  }
}

async function main({ args: [action = 'none'] }) {
  const { pid } = await getForgeWorkshopProcess();

  const port = config.get('workshop.port') || DEFAULT_WORKSHOP_PORT;
  const workshopUrl = `http://127.0.0.1:${port}`;

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
