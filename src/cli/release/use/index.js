const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { getMinSupportForgeVersion } = require('core/libs/common');
const { execute, run } = require('./use');

const minSupportVersion = getMinSupportForgeVersion();

cli(
  'use [version]',
  'Activate an already downloaded forge release',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: false,
      rpcClient: false,
      wallet: false,
      chainName: false,
      chainExists: false,
    },
    options: [],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan(`forge use ${minSupportVersion}`)}      activate forge v${minSupportVersion}
  - ${chalk.cyan(`forge use v${minSupportVersion}`)}     activate forge v${minSupportVersion}
        `);
      },
    },
  }
);
