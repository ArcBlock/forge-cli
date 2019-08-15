const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./activate');

cli(
  'protocol:activate [name|address]',
  'Activate a transaction protocol by name or address',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: true,
      rpcClient: true,
      wallet: false,
    },
    options: [],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan('forge activate transfer')}         Activate protocol by name
  - ${chalk.cyan(
    'forge activate z2E3vuTEWpE7PhmVP61eZWJXutgxMHeimwqtv'
  )}   Activate protocol by address
        `);
      },
    },
  }
);