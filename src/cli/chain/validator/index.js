// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./validator');

cli('chain:validator', 'Update(add, remove, change power) validators', input => action(execute, run, input), {
  requirements: {
    forgeRelease: true,
    runningNode: true,
    rpcClient: true,
    wallet: false,
    chainName: true,
    chainExists: true,
    currentChainRunning: true,
  },
  options: [],
});
