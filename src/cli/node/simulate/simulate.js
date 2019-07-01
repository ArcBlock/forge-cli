const shell = require('shelljs');
const chalk = require('chalk');
const { symbols } = require('core/ui');
const { runNativeSimulatorCommand, findServicePid } = require('core/env');

const startSimulator = runNativeSimulatorCommand('daemon');

async function main({ args: [action = 'start'] }) {
  const pid = await findServicePid('simulator');
  if (action === 'start') {
    if (pid) {
      shell.echo(`${symbols.error} simulator is already started!`);
      process.exit(0);
    } else {
      startSimulator();
      shell.echo(`${symbols.success} Simulator started`);
    }
  }

  if (action === 'stop') {
    if (pid) {
      shell.exec(`kill ${pid}`);
      shell.echo(`${symbols.success} Simulator stopped`);
    } else {
      shell.echo(`${symbols.error} simulator is not started yet!`);
      shell.echo(`${symbols.info} Please run ${chalk.cyan('forge simulate start')} first!`);
      process.exit(0);
    }
  }

  process.exit();
}

exports.run = main;
exports.execute = main;
