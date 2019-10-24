const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./config');

cli('chain:config [action]', 'Read/write chain/node config', input => action(execute, run, input), {
  requirements: {
    forgeRelease: true,
    rpcClient: true,
    wallet: false,
  },
  options: [['-p, --peer', 'Fetch config for peer to join this chain']],
  handlers: {
    '--help': () => {
      shell.echo(`
Examples:
  - ${chalk.cyan('forge config')}             Show config for current node
  - ${chalk.cyan('forge config --peer')}      Generate config for peer(new node)
  - ${chalk.cyan('forge config set')}         Update forge config
`);
    },
  },
});
