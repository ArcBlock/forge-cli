// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./version');

cli(
  'version [<chainName>]',
  'Output version for all forge components',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      rpcClient: true,
      wallet: false,
      chainName: true,
      chainExists: true,
    },
    parseArgs: chainName => ({ chainName }),
    options: [],
  }
);
