const chalk = require('chalk');

const { cli, action } = require('core/cli');
const { print } = require('core/util');

const { execute, run } = require('./remove');

cli(
  'chain:remove <chainName>',
  'Remove chain state and config',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: false,
      rpcClient: false,
      wallet: false,
      chainName: true,
      chainExists: true,
    },
    parseArgs: chainName => ({
      chainName,
    }),
    handlers: {
      '--help': () => {
        print(`
Examples:
- ${chalk.cyan('forge chain:remove chain-1')}           remove interactively
- ${chalk.cyan('forge chain:remove chain-1 --yes')}     force remove
      `);
      },
    },
  }
);
