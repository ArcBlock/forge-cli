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
    options: [['-f, --force', 'Kill all forge related processes, useful for cleanup']],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan('forge stop')}             stop forge in graceful manner
  - ${chalk.cyan('forge stop -f')}          stop forge related process with kill
  - ${chalk.cyan('forge stop --force')}     same as above`);
      },
    },
  }
);
