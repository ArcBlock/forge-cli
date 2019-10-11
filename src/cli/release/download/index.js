const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./download');

cli(
  'download [version]',
  'Download a forge release without activate it',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: false,
      runningNode: false,
      rpcClient: false,
      wallet: false,
      chainName: false,
      chainExists: false,
    },
    options: [['-f, --force', 'Clean local downloaded assets before download']],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan('forge download')}           download latest version
  - ${chalk.cyan('forge download 0.38.7')}    download forge v0.38.7
  - ${chalk.cyan('forge download v0.38.7')}   download forge v0.38.7
  - ${chalk.cyan('forge download --mirror https://releases.arcblockio.cn')}      specify a mirror
        `);
      },
    },
  }
);
