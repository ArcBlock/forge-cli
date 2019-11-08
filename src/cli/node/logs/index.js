const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./logs');

cli('logs [type]', 'Show logs for various forge components', input => action(execute, run, input), {
  requirements: {
    forgeRelease: true,
    runningNode: false,
    rpcClient: true,
    wallet: false,
    chainExists: true,
  },
  options: [],
  handlers: {
    '--help': () => {
      shell.echo(`
Examples:
  - ${chalk.cyan('forge logs')}               display all logs
  - ${chalk.cyan('forge logs app')}           display app logs
  - ${chalk.cyan('forge logs transaction')}   display forge transaction log
  - ${chalk.cyan('forge logs error')}         display forge error log
  - ${chalk.cyan('forge logs tendermint')}    display tendermint logs
  - ${chalk.cyan('forge logs cli')}    display cli error logs
        `);
    },
  },
});
