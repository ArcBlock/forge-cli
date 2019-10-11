// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { getTopRunningChains } = require('core/forge-process');
const { execute, run } = require('./simulate');

cli(
  'simulator [action]',
  'Start/stop simulator and generate random traffic',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: true,
      rpcClient: false,
      wallet: false,
      chainName: getTopRunningChains,
      currentChainRunning: true,
    },
    options: [],
  }
);
