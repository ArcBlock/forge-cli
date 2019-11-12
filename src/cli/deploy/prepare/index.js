const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./prepare');

cli(
  'deploy:prepare',
  'Prepare node for deploying a multi-node chain',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: false,
      rpcClient: false,
      wallet: false,
    },
    options: [
      ['-m, --mode <mode>', 'Whether we want to init or add peer to this node, default init'],
      ['-w, --write-config', 'Persist config to local file, default false'],
    ],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan(
    'forge prepare'
  )}                  Reinitialize local node and just print the config
  - ${chalk.cyan('forge prepare --write-config')}   Reinitialize local node and update it's config
  - ${chalk.cyan('forge prepare --mode join')}      Add a new peer to current node
  - ${chalk.cyan('forge prepare --mode init')}      Initialize local node
        `);
      },
    },
  }
);
