/* eslint no-case-declarations:"off" */
const shell = require('shelljs');
const { runNativeWorkshopCommand, sleep } = require('core/env');
const { findServicePid } = require('forge-process');
const { symbols } = require('core/ui');

const startWorkshop = runNativeWorkshopCommand('daemon', { silent: true });
const workshopUrl = 'http://127.0.0.1:8807';

function processOutput(output, action) {
  if (/:error/.test(output)) {
    if (/:already_started/.test(output)) {
      shell.echo(`${symbols.warning} forge workshop already started`);
    } else {
      shell.echo(`${symbols.error} forge workshop ${action} failed: ${output.trim()}`);
    }
  } else {
    shell.echo(`${symbols.success} forge workshop ${action} success!`);
  }
}

async function main({ args: [action = 'none'] }) {
  const pid = await findServicePid('forge_workshop');

  /* eslint-disable indent */
  switch (action) {
    case 'none':
      shell.exec('forge workshop -h --color always');
      break;
    case 'start':
      if (pid) {
        shell.echo(`${symbols.info} forge workshop already started`);
        process.exit(0);
        return;
      }

      const { stdout, stderr } = startWorkshop();
      processOutput(stdout || stderr, action);
      shell.echo(`${symbols.info} forge workshop running at: ${workshopUrl}`);
      break;
    case 'stop':
      if (!pid) {
        shell.echo(`${symbols.info} forge web not started yet`);
        process.exit(1);
        return;
      }
      shell.echo('Stopping forge workshop...');
      shell.exec(`kill ${pid}`);
      break;
    case 'open':
      if (!pid) {
        shell.echo(`${symbols.info} forge workshop not started yet`);
        await main({ args: ['start'] });
        await sleep(2000);
      }
      shell.echo(`Opening ${workshopUrl}...`);
      shell.exec(`open ${workshopUrl}`);
      break;
    default:
      break;
  }
  /* eslint-enable indent */
}

exports.run = main;
exports.execute = main;
