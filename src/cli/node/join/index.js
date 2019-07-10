// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./join');

cli(
  'join <endpoint>',
  'Join a network by providing a valid forge web graphql endpoint',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: false,
      rpcClient: true,
      wallet: false,
    },
    options: [],
  }
);
