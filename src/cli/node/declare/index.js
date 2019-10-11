// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { getTopRunningChains } = require('core/forge-process');
const { execute, run } = require('./declare');

cli(
  'declare:node',
  'Declare the current node to be a validator candidate',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: true,
      rpcClient: true,
      wallet: false,
      chainName: getTopRunningChains,
      currentChainRunning: true,
    },
    options: [],
  }
);
