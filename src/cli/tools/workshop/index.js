const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { getTopRunningChains } = require('core/forge-process');
const { execute, run } = require('./workshop');

cli('workshop [action]', 'Start/stop the dApps workshop', input => action(execute, run, input), {
  requirements: {
    forgeRelease: true,
    runningNode: true,
    rpcClient: true,
    wallet: false,
    chainName: getTopRunningChains,
    currentChainRunning: true,
  },
  handlers: {
    '--help': () => {
      shell.echo(`
Examples:
  - ${chalk.cyan('forge workshop start')}          start forge workshop
  - ${chalk.cyan('forge workshop stop')}           stop forge workshop
  - ${chalk.cyan('forge workshop open')}           open workshop in browser
        `);
    },
  },
});
