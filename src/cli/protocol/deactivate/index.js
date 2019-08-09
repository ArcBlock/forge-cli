const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./deactivate');

cli(
  'protocol:deactivate [name|adderss]',
  'Deactivate a transaction protocol',
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
  - ${chalk.cyan('forge deactivate transfer')}         deactivate protocol by name
  - ${chalk.cyan(
    'forge deactivate z2E3vuTEWpE7PhmVP61eZWJXutgxMHeimwqtv'
  )}   deactivate protocol by address
        `);
      },
    },
  }
);
