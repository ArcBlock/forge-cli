const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { getMinSupportForgeVersion } = require('core/libs/common');
const { execute, run } = require('./install');

const minSupportVersion = getMinSupportForgeVersion();

cli(
  'install [version]',
  'Download and setup forge release on this machine',
  input => action(execute, run, input),
  {
    alias: 'init',
    requirements: {
      forgeRelease: false,
      rpcClient: false,
      chainName: false,
      chainExists: false,
    },
    options: [['-f, --force', 'Clean local downloaded assets before install']],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan(
    'forge install'
  )}             Download and activate latest version, prompt to customize config
  - ${chalk.cyan(
    `forge install ${minSupportVersion}`
  )}      Download and activate forge v${minSupportVersion}
  - ${chalk.cyan(
    `forge install v${minSupportVersion}`
  )}     Download and activate forge v${minSupportVersion}
  - ${chalk.cyan(
    'forge install --mirror http://releases.arcblockio.cn'
  )}      Install latest forge from custom mirror
        `);
      },
    },
  }
);
