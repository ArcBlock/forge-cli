const shell = require('shelljs');
const chalk = require('chalk');

const { cli, action } = require('core/cli');
const { defaultChainNameHandler } = require('core/libs/common');

const { execute, run } = require('./start');

cli(
  'start [<chainName>]',
  'Start a chain daemon, if does not specify a chain name, it will start a default chain',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      rpcClient: true,
      chainName: defaultChainNameHandler,
      chainExists: true,
    },
    parseArgs: chainName => ({ chainName }),
    options: [['--dry-run', 'Start in dry-run mode, print the start command']],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan(
    'forge start arcblock'
  )}     Start forge node named arcblock, ensure single chain and single node
  - ${chalk.cyan('forge start --dry-run')}    Just print the start command
        `);
      },
    },
  }
);
