const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { getTopRunningChains } = require('core/forge-process');
const { execute, run } = require('./activate');

cli(
  'contract:activate [name|address]',
  'Activate a contract by name or address',
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
  - ${chalk.cyan('forge activate transfer')}         Activate contract by name
  - ${chalk.cyan(
    'forge activate z2E3vuTEWpE7PhmVP61eZWJXutgxMHeimwqtv'
  )}   Activate contract by address
        `);
      },
    },
  }
);
