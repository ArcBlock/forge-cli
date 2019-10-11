// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { getTopRunningChains } = require('core/forge-process');
const { execute, run } = require('./list');

cli(
  'account:list [role]',
  'List all accounts stored in this node',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: false,
      runningNode: true,
      rpcClient: true,
      currentChainRunning: true,
      chainName: getTopRunningChains,
    },
    options: [
      // ['--some-option [value]', 'some test option'],
    ],
  }
);
