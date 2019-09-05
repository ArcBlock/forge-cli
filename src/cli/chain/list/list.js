const chalk = require('chalk');
const Table = require('cli-table-redemption');

const { print } = require('core/util');
const { getAllChainNames } = require('core/forge-fs');
const { getAllProcesses } = require('core/forge-process');

const getChainStatus = (name, processes) => {
  const processesMap = processes.reduce((acc, item) => {
    acc[item.name] = item.value;

    return acc;
  }, {});

  let status = '';
  if (processesMap[name]) {
    const hasForgeProcess = processesMap[name].find(x => x.name === 'forge');
    if (hasForgeProcess) {
      status = 'running';
    } else {
      status = 'errored';
    }
  } else {
    status = 'stopped';
  }

  return status;
};

const getChainStatusColor = status => {
  switch (status) {
    case 'running':
      return 'green';
    case 'stopped':
    case 'errored':
      return 'red';
    default:
      return '';
  }
};

async function printChains() {
  const chains = getAllChainNames();
  if (chains.length === 0) {
    return;
  }

  print('All Chains:');

  const table = new Table({
    head: ['Name', 'Version', 'Status'],
    style: { 'padding-left': 1, head: ['cyan', 'bold'], compact: true },
    colWidths: [20, 15, 15],
  });

  const processes = await getAllProcesses();
  chains.forEach(([name, config]) => {
    const status = getChainStatus(name, processes);
    table.push([name, `v${config.version}`, chalk`{${getChainStatusColor(status)} ${status}}`]);
  });

  print(table.toString());
}

async function main() {
  await printChains();

  process.exit(0);
}

exports.run = main;
exports.execute = main;
