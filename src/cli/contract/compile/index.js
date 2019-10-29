// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./compile');

cli(
  'contract:compile [sourceDir]',
  'Compile a forge contract',
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
  }
);
