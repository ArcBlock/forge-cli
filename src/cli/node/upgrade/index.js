// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./upgrade');

cli(
  'upgrade',
  'Upgrade chain node to new version without reset',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: true,
      rpcClient: true,
      wallet: false,
    },
    options: [],
  }
);
