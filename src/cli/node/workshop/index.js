const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./workshop');

cli('workshop [action]', 'Start or stop the did workshop', input => action(execute, run, input), {
  requirements: {
    forgeRelease: true,
    runningNode: true,
    rpcClient: true,
    wallet: false,
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
