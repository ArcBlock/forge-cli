const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { print } = require('core/util');
const { getTopRunningChains } = require('core/forge-process');
const { execute, run } = require('./declare');

cli(
  'declare:node',
  'Declare the current node to be a validator candidate',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: true,
      rpcClient: true,
      wallet: false,
      chainName: getTopRunningChains,
      currentChainRunning: true,
      chainExists: true,
    },
    handlers: {
      '--help': () => {
        print(`
Examples:
- ${chalk.cyan('forge declare:node')}                   Declare current node on chain
      `);
      },
    },
  }
);
