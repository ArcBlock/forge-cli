// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./create');

cli('contract:create', 'Create contract files', input => action(execute, run, input), {
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
    ['-n, --contract-name <contractName>', 'contract name'],
    ['-s, --contract-desc <contractDesc>', 'contract description'],
  ],
});
