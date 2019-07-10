// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./ps');

cli('ps', 'List running forge component processes', input => action(execute, run, input), {
  requirements: {
    forgeRelease: true,
    runningNode: true,
    rpcClient: true,
    wallet: false,
  },
  options: [],
});
