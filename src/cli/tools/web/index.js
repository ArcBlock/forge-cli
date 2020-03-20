const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./web');

cli(
  'web [action]',
  'Open the web interface of running forge chain/node',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: false,
      runningNode: false,
      rpcClient: false,
      wallet: false,
      chainName: false,
      currentChainRunning: false,
    },
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan('forge web open')}           open admin panel in default browser
  - ${chalk.cyan(
    'forge web open -c <chain name>'
  )}           open specified chain admin panel in default browser
        `);
      },
    },
  }
);
