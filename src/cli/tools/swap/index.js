// eslint-disable-next-line import/no-unresolved
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { print } = require('core/util');
const { execute, run } = require('./swap');

cli('swap [action] [version]', 'Start Forge Swap service', input => action(execute, run, input), {
  requirements: {
    forgeRelease: false,
    runningNode: false,
    rpcClient: false,
    wallet: false,
    chainName: false,
    chainExists: false,
    currentChainRunning: false,
  },
  handlers: {
    '--help': () => {
      print(`
Examples:
  - ${chalk.cyan('forge swap config')}         Config Forge Swap
  - ${chalk.cyan('forge swap start 1.0.0')}    Start Forge Swap
  - ${chalk.cyan('forge swap stop')}           Stop Forge Swap
        `);
    },
  },
});
