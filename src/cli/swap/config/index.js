// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./config');

cli('swap config', 'Config atomic swap service', input => action(execute, run, input), {
  requirements: {
    forgeRelease: true,
    runningNode: false,
    rpcClient: false,
    wallet: false,
    chainName: false,
    chainExists: false,
    currentChainRunning: false,
  },
});
