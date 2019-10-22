const { cli, action } = require('core/cli');

const { execute, run } = require('./ps');

cli('ps', 'List running forge component processes', input => action(execute, run, input), {
  requirements: {
    forgeRelease: false,
    runningNode: false,
    rpcClient: false,
    wallet: false,
    chainName: false,
  },
  options: [],
});
