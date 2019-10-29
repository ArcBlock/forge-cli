const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { print } = require('core/util');
const { getTopRunningChains } = require('core/forge-process');

const { execute, run } = require('./stop');

cli(
  'stop [<chainName>]',
  'Stop the forge daemon and all related services',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: false,
      rpcClient: false,
      chainName: getTopRunningChains,
    },
    parseArgs: chainName => ({ chainName }),
    options: [
      ['-a, --all', 'Stop all forge related processes'],
      ['-f, --force', '[Deprecated] Stop all forge related processes'],
    ],
    handlers: {
      '--help': () => {
        print(`
Examples:
  - ${chalk.cyan('forge stop')}             stop default chain in graceful manner
  - ${chalk.cyan('forge stop test')}             stop test chain in graceful manner
  - ${chalk.cyan('forge stop -a')}          stop all forge related processes
  - ${chalk.cyan('forge stop --all')}     same as above`);
      },
    },
  }
);
