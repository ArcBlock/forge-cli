const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./install');

cli(
  'install [version]',
  'Download and setup forge release on this machine',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: false,
      rpcClient: false,
    },
    options: [
      ['-m, --mirror <url>', 'Mirror host used to download forge release'],
      ['-s, --silent', 'Install release silently, do not prompt for config customization'],
    ],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan(
    'forge install'
  )}             Download and activate latest version, prompt to customize config
  - ${chalk.cyan('forge install --silent')}    Download and setup with default config
  - ${chalk.cyan('forge install 0.22.0')}      Download and activate forge v0.22.0
  - ${chalk.cyan('forge install v0.22.0')}     Download and activate forge v0.22.0
  - ${chalk.cyan(
    'forge install --mirror http://arcblock.oss-cn-beijing.aliyuncs.com'
  )}      Download from custom mirror
        `);
      },
    },
  }
);
