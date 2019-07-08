const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./init');

cli(
  'install [version]',
  'Download and setup forge release on this machine',
  input => action(execute, run, input),
  {
    alias: 'init',
    requirements: {
      forgeRelease: false,
      rpcClient: false,
    },
    options: [['-m, --mirror <url>', 'Mirror host used to download forge release']],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan('forge install')}             download and activate latest version
  - ${chalk.cyan('forge install 0.22.0')}      download and activate forge v0.22.0
  - ${chalk.cyan('forge install v0.22.0')}     download and activate forge v0.22.0
  - ${chalk.cyan(
    'forge install --mirror http://arcblock.oss-cn-beijing.aliyuncs.com'
  )}      specify a custom mirror for download
        `);
      },
    },
  }
);
