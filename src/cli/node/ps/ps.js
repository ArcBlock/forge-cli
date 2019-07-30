const shell = require('shelljs');
const chalk = require('chalk');
const Table = require('cli-table-redemption');
const { symbols } = require('core/ui');

const { getAllRunningProcesses } = require('core/forge-process');

async function main() {
  const processes = await getAllRunningProcesses();

  if (!Object.keys(processes)) {
    shell.echo(
      `${symbols.warning} forge daemon not started yet, start with ${chalk.cyan('forge start')}`
    );
    shell.echo('');
    process.exit(0);
  }

  Object.keys(processes).forEach(appName => {
    const table = new Table({
      head: ['Name', 'PID', 'Uptime', 'Memory', 'CPU'],
      style: { 'padding-left': 1, head: ['cyan', 'bold'], compact: true },
      colWidths: [15, 10, 10, 15, 20],
    });

    processes[appName].forEach(x => table.push(Object.values(x)));
    shell.echo(`App: ${appName}`);
    shell.echo(table.toString());
  });

  process.exit(0);
}

exports.run = main;
exports.execute = main;
