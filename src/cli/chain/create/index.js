const shell = require('shelljs');
const { cli, action } = require('core/cli');

const { execute, run } = require('./create');

cli(
  'chain:create [chainName]',
  'Create a new chain instance',
  input => action(execute, run, input),
  {
    alias: 'create-chain',
    parseArgs: chainName => ({
      chainName,
    }),
    requirements: {
      forgeRelease: true,
      rpcClient: false,
      runningNode: false,
      wallet: false,
      chainName: false,
      chainExists: false,
    },
    handlers: {
      '--help': () => {
        shell.echo('Create an empty space to store forge data');
      },
    },
  }
);
