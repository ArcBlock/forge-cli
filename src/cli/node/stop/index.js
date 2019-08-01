const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./stop');

cli(
  'stop',
  'Stop the forge daemon and all forge components',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: false,
      rpcClient: false,
    },
    options: [['-a, --all', 'Stop all forge related processes']],
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
