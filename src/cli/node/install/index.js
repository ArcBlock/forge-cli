const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./install');
const { version } = require('../../../../package.json');

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
    options: [['-s, --silent', 'Install release silently, do not prompt for config customization']],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan(
    'forge install'
  )}             Download and activate latest version, prompt to customize config
  - ${chalk.cyan('forge install --silent')}    Download and setup with default config
  - ${chalk.cyan(`forge install ${version}`)}      Download and activate forge v${version}
  - ${chalk.cyan(`forge install v${version}`)}     Download and activate forge v${version}
  - ${chalk.cyan(
    'forge install --mirror http://arcblockcn.oss-cn-beijing.aliyuncs.com'
  )}      Install latest forge from custom mirror
        `);
      },
    },
  }
);
