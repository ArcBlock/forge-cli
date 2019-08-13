const chalk = require('chalk');
const os = require('os');

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

  print(`${os.EOL}All Chains:`);
  chains.forEach(name => {
    const message = processesMap[name]
      ? `${chalk.cyan(`  ✓ ${name}  `)} [${chalk.green('running')}]`
      : `  - ${name}`;
    print(message);
  });
}

async function main() {
  await printChains();

  process.exit(0);
}

exports.run = main;
exports.execute = main;
