// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { getTopRunningChains } = require('core/forge-process');
const { execute, run } = require('./list');

cli('contract:ls', 'List transaction contracts', input => action(execute, run, input), {
  requirements: {
    forgeRelease: true,
    runningNode: true,
    rpcClient: true,
    wallet: false,
    chainName: getTopRunningChains,
    currentChainRunning: true,
  },
  options: [],
});
