const chalk = require('chalk');
const Table = require('cli-table-redemption');

const { print } = require('core/util');
const { getAllChainNames } = require('core/forge-fs');
const { getAllProcesses } = require('core/forge-process');

async function printChains() {
  const chains = getAllChainNames();
  const processes = await getAllProcesses();
  if (chains.length === 0) {
    return;
  }

  const processesMap = processes.reduce((acc, item) => {
    acc[item.name] = item.value;

    return acc;
  }, {});

  print('All Chains:');

  const table = new Table({
    head: ['Name', 'Version', 'Status'],
    style: { 'padding-left': 1, head: ['cyan', 'bold'], compact: true },
    colWidths: [20, 15, 15],
  });

  chains.forEach(([name, config]) => {
    table.push([
      name,
      `v${config.version}`,
      processesMap[name] ? chalk.green('running') : chalk.red('stopped'),
    ]);
  });

  print(table.toString());
}

async function main() {
  await printChains();

  process.exit(0);
}

exports.run = main;
exports.execute = main;
