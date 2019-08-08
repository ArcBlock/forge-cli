// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const chalk = require('chalk');
const { print } = require('core/util');
const { execute, run } = require('./remote');

cli(
  'remote [shell_name]',
  'Connects to the running system via a remote shell',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: false,
      rpcClient: false,
      wallet: false,
    },
    options: [],
    handlers: {
      '--help': () => {
        // prettier-ignore
        print(`
Examples:
  - ${chalk.cyan('forge remote forge')}    connect the remote ${chalk.cyan(
  'forge'
)} shell of ${chalk.cyan('default')} chain
  - ${chalk.cyan('forge remote web -c arcblock')}    connect the remote ${chalk.cyan(
  'web'
)} shell of ${chalk.cyan('arcblock')} chain
        `);
      },
    },
  }
);