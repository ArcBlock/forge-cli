const chalk = require('chalk');

const { cli, action } = require('core/cli');
const { print } = require('core/util');

const { execute, run } = require('./remove');

cli('chain:remove [<chainName>]', 'Remove chains', input => action(execute, run, input), {
  alias: 'reset',
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
- ${chalk.cyan('forge chain:remove chain-1')}           remove interactively
- ${chalk.cyan('forge chain:remove chain-1 --yes')}     force remove
      `);
    },
  },
});
