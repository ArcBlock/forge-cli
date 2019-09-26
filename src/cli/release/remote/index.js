// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./remote');

cli(
  'ls:remote',
  'List remote forge releases available for install',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: false,
      runningNode: false,
      rpcClient: false,
      wallet: false,
      chainName: false,
    },
    options: [],
  }
);
