const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { getAllProcesses } = require('core/forge-process');
const { printWarning } = require('core/util');

const { execute, run } = require('./stop');

cli(
  'stop [<chainName>]',
  'Stop the forge daemon and all forge components, if does not specify a chain name, it will start a default chain',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: false,
      rpcClient: false,
      chainName: async ({ chainName }) => {
        if (chainName) {
          return chainName;
        }

        const allProcesses = await getAllProcesses();

        if (allProcesses.length === 0) {
          printWarning('No running processes');
          process.exit(0);
        }

        return allProcesses[0].name;
      },
    },
    parseArgs: chainName => chainName,
    options: [
      ['-a, --all', 'Stop all forge related processes'],
      ['-f, --force', '[Deprecated] Stop all forge related processes'],
    ],
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
