const chalk = require('chalk');
const Table = require('cli-table-redemption');
const { print, printInfo } = require('core/util');
const { getAllRunningProcessStats } = require('core/forge-process');

const printAllProcesses = async () => {
  const processes = await getAllRunningProcessStats();

  if (!processes || !processes.length) {
    printInfo(`Forge is not started yet, start with ${chalk.cyan('forge start')}`);
    process.exit(0);
  }

  print();
  processes.forEach(({ name, value: stats, config }) => {
    const table = new Table({
      head: ['Name', 'PID', 'Uptime', 'Memory', 'CPU', 'Endpoint'],
      style: { 'padding-left': 1, head: ['cyan', 'bold'] },
      colWidths: [15, 10, 10, 10, 10, 30],
    });

    stats.forEach(x => table.push(Object.values(x)));
    print(` Chain: ${chalk.green(name)} ${chalk.yellow(`v${config.version}`)}`);
    print(table.toString());
    print();
  });
};

async function main() {
  await printAllProcesses();

  process.exit(0);
}

exports.run = main;
exports.execute = main;
exports.printAllProcesses = printAllProcesses;
