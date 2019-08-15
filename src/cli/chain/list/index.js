const { cli, action } = require('core/cli');

const { execute, run } = require('./list');

cli('chain:ls', 'List all chains', input => action(execute, run, input), {
  alias: 'chains',
  requirements: {
    forgeRelease: true,
    rpcClient: false,
    runningNode: false,
    wallet: false,
  },
});
