const chalk = require('chalk');

const { cli, action } = require('core/cli');
const { print } = require('core/util');

const { execute, run } = require('./reset');

cli(
  'chain:reset <chainName>',
  'Reset chain state, but keeps the config',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: false,
      rpcClient: false,
      wallet: false,
      chainExists: true,
    },
    parseArgs: chainName => ({
      chainName,
    }),
    handlers: {
      '--help': () => {
        print(`
Examples:
- ${chalk.cyan('forge chain:reset chain-1')}           Reset interactively
- ${chalk.cyan('forge chain:reset chain-1 --yes')}     Force reset
      `);
      },
    },
  }
);
