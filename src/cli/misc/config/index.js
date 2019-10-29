// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./config');

cli('config [key] [value]', 'Config forge cli configs', input => action(execute, run, input), {
  requirements: {
    forgeRelease: false,
    runningNode: false,
    rpcClient: false,
    wallet: false,
    chainName: false,
    chainExists: false,
    currentChainRunning: false,
  },
  options: [['-l, --list', 'list all global configs']],
});
