const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { getTopRunningChains } = require('core/forge-process');

const { execute, run } = require('./stop');

cli(
  'stop [<chainName>]',
  'Stop the forge daemon and all forge components, if does not specify a chain name, it will start a default chain',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: false,
      rpcClient: false,
      chainName: getTopRunningChains,
      currentChainRunning: true,
    },
    parseArgs: chainName => ({ chainName }),
    options: [
      ['-a, --all', 'Stop all forge related processes'],
      ['-f, --force', '[Deprecated] Stop all forge related processes'],
    ],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan('forge stop')}             stop default chain in graceful manner
  - ${chalk.cyan('forge stop test')}             stop test chain in graceful manner
  - ${chalk.cyan('forge stop -a')}          stop all forge related processes
  - ${chalk.cyan('forge stop --all')}     same as above`);
      },
    },
  }
);
