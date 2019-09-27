const { cli, action } = require('core/cli');
const { defaultChainNameHandler } = require('core/libs/common');

const { execute, run } = require('./ps');

cli('ps', 'List running forge component processes', input => action(execute, run, input), {
  requirements: {
    forgeRelease: true,
    runningNode: false,
    rpcClient: true,
    wallet: false,
    chainName: defaultChainNameHandler,
  },
  options: [],
});
