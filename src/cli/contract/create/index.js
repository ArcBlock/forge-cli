// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./create');

cli('contract:create', 'Create transaction contract files', input => action(execute, run, input), {
  requirements: {
    forgeRelease: false,
    runningNode: false,
    rpcClient: false,
    wallet: false,
    chainName: false,
    chainExists: false,
    currentChainRunning: false,
  },
  options: [
    ['-n, --contract-name <contractName>', 'transaction contract name'],
    ['-s, --contract-desc <contractDesc>', 'transaction contract description'],
  ],
});
