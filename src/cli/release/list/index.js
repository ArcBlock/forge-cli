// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./list');

cli('ls', 'List forge releases installed locally', input => action(execute, run, input), {
  requirements: {
    forgeRelease: false,
    runningNode: false,
    rpcClient: false,
    wallet: false,
    chainName: false,
    chainExists: false,
  },
  options: [],
});
