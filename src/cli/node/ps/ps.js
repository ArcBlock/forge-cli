const chalk = require('chalk');
const Table = require('cli-table-redemption');
const { print, printInfo } = require('core/util');
const { getForgeSwapConfigFile } = require('core/forge-fs');
const findProcess = require('find-process');
const { getAllRunningProcessStats, getForgeSwapProcessStats } = require('core/forge-process');

const { SEMVER_REGEX } = require('../../../constant');
const { readForgeSwapConfig } = require('../../tools/swap/config');

const printAllProcesses = async () => {
  const processes = await getAllRunningProcessStats();
  const swapStats = await getForgeSwapProcessStats();

  if ((!processes || !processes.length) && !swapStats) {
    printInfo(`forge daemon not started yet, start with ${chalk.cyan('forge start')}`);
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

  if (swapStats) {
    const {
      service: { schema, host, port },
    } = await readForgeSwapConfig(getForgeSwapConfigFile());

    const endpoint = `${schema}://${host}:${port}`;
    const [{ bin }] = await findProcess('pid', swapStats.pid);
    const matchResult = bin.match(SEMVER_REGEX);
    let version = '';
    if (matchResult) {
      version = matchResult[1]; // eslint-disable-line
    }

    const table = new Table({
      head: ['PID', 'Uptime', 'Memory', 'CPU', 'Endpoint'],
      style: { 'padding-left': 1, head: ['cyan', 'bold'] },
      colWidths: [15, 10, 10, 10, 30],
    });

    table.push([swapStats.pid, swapStats.uptime, swapStats.memory, swapStats.cpu, endpoint]);
    print(` Forge Swap ${chalk.yellow(`v${version}`)}`);
    print(table.toString());
    print();
  }
};

async function main() {
  await printAllProcesses();

  process.exit(0);
}

exports.run = main;
exports.execute = main;
exports.printAllProcesses = printAllProcesses;
