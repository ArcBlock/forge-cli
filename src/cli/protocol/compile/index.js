// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./compile');

cli(
  'protocol:compile [sourceDir]',
  'Compile a forge transaction protocol',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: false,
      rpcClient: false,
      wallet: false,
    },
    options: [],
  }
);
