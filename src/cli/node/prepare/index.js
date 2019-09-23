// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./prepare');

cli(
  'prepare',
  'Prepare node for deploying a multi-node chain',
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
