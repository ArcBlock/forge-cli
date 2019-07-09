const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./create');

cli(
  'wallet:create',
  'Create an local wallet and dump its public/private key',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: false,
      runningNode: false,
      rpcClient: false,
      wallet: false,
    },
    options: [['-d, --defaults', 'Use default account type']],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan('forge wallet:create')}              Create wallet interactively
  - ${chalk.cyan('forge wallet:create --defaults')}   Create wallet of default type`);
      },
    },
  }
);
