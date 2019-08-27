const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./join');

cli(
  'join <endpoint>',
  'Join a network by providing a valid forge web graphql endpoint',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: false,
      rpcClient: true,
      wallet: false,
    },
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan('forge join https://zinc.abtnetwork.io/api')}          Join a network
  - ${chalk.cyan(
    'forge join https://zinc.abtnetwork.io/api --yes'
  )}    Join a network without safety prompt
        `);
      },
    },
  }
);
