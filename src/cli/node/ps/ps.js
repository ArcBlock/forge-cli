const shell = require('shelljs');
const chalk = require('chalk');
const Table = require('cli-table-redemption');
const { printInfo } = require('core/util');

const { getAllRunningProcesses } = require('core/forge-process');

async function main() {
  const processes = await getAllRunningProcesses();

  if (!processes || !processes.length) {
    printInfo(`forge daemon not started yet, start with ${chalk.cyan('forge start')}`);
    process.exit(0);
  }

  processes.forEach(({ name, stats }) => {
    const table = new Table({
      head: ['Name', 'PID', 'Uptime', 'Memory', 'CPU'],
      style: { 'padding-left': 1, head: ['cyan', 'bold'], compact: true },
      colWidths: [15, 10, 10, 15, 20],
    });

    stats.forEach(x => table.push(Object.values(x)));
    shell.echo(`Chain: ${name}`);
    shell.echo(table.toString());
  });

  process.exit(0);
}

exports.run = main;
exports.execute = main;
