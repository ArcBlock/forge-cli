const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./state');

cli('status [type]', 'List info of the running chain/node', input => action(execute, run, input), {
  requirements: {
    forgeRelease: true,
    runningNode: true,
    rpcClient: true,
    wallet: false,
  },
  options: [],
  handlers: {
    '--help': () => {
      shell.echo(`
Examples:
  - ${chalk.cyan('forge status')}           display status for chain
  - ${chalk.cyan('forge status chain')}     display status about chain
  - ${chalk.cyan('forge status core')}      display status of forge core
  - ${chalk.cyan('forge status net')}       display status of network
  - ${chalk.cyan('forge status validator')} display status of validators
  - ${chalk.cyan('forge status all')}       display status of all components
        `);
    },
  },
});
