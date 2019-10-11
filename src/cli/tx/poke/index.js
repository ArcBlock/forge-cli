// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { getTopRunningChains } = require('core/forge-process');
const { execute, run } = require('./poke');

cli(
  'checkin',
  'Send a poke tx to the network to get tokens for test',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: true,
      rpcClient: true,
      wallet: true,
      chainName: getTopRunningChains,
      currentChainRunning: true,
    },
    options: [],
  }
);
