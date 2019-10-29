// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { getTopRunningChains } = require('core/forge-process');
const { execute, run } = require('./deploy');

cli(
  'contract:deploy [itxPath]',
  'Deploy a compiled contract to ABT Node',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: false,
      rpcClient: true,
      wallet: false,
      chainName: getTopRunningChains,
      currentChainRunning: true,
    },
    options: [],
  }
);
