const chalk = require('chalk');
const shell = require('shelljs');
const { cli, action } = require('core/cli');
const { getTopRunningChains } = require('core/forge-process');
const { execute, run } = require('./display');

cli('account <address>', 'Get an account info by address', input => action(execute, run, input), {
  requirements: {
    forgeRelease: false,
    runningNode: true,
    rpcClient: true,
    wallet: args => {
      if (args && args[0] === 'me') {
        return true;
      }
      return false;
    },
    currentChainRunning: true,
    chainName: getTopRunningChains,
  },
  options: [],
  handlers: {
    '--help': () => {
      shell.echo(`
Examples:
  - ${chalk.cyan('forge account me')}                     Show account state for current wallet
  - ${chalk.cyan('forge account zyquEMz5kiVu78SF1')}      Show account state for specified address
        `);
    },
  },
});
