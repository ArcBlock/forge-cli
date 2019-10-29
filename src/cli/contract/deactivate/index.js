const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { getTopRunningChains } = require('core/forge-process');
const { execute, run } = require('./deactivate');

cli(
  'contract:deactivate [name|address]',
  'Deactivate a contract',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: true,
      rpcClient: true,
      wallet: false,
      chainName: getTopRunningChains,
      currentChainRunning: true,
    },
    options: [],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan('forge deactivate transfer')}         deactivate contract by name
  - ${chalk.cyan(
    'forge deactivate z2E3vuTEWpE7PhmVP61eZWJXutgxMHeimwqtv'
  )}   deactivate contract by address
        `);
      },
    },
  }
);
