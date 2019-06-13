/* eslint no-case-declarations:"off" */
const shell = require('shelljs');
const { runNativeWorkshopCommand, debug, sleep } = require('core/env');
const { symbols } = require('core/ui');

const startWorkshop = runNativeWorkshopCommand('start', { silent: true });
const stopWorkshop = runNativeWorkshopCommand('stop', { silent: true });
const pidWorkshop = runNativeWorkshopCommand('pid', { silent: true });
const workshopUrl = 'http://127.0.0.1:8807';

function isWorkshopStarted() {
  const { stdout } = pidWorkshop();
  if (Number(stdout)) {
    return true;
  }

  return false;
}

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
  /* eslint-disable indent */
  switch (action) {
    case 'none':
      shell.exec('forge workshop -h --color always');
      break;
    case 'start':
      const { stdout, stderr } = startWorkshop();
      processOutput(stdout || stderr, action);
      shell.echo(`${symbols.info} forge workshop running at: ${workshopUrl}`);
      break;
    case 'stop':
      const { stdout: stdout2, stderr: stderr2 } = stopWorkshop();
      debug('stop', { stdout2, stderr2 });
      processOutput(stdout2 || stderr2, action);
      break;
    case 'open':
      if (isWorkshopStarted() === false) {
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
