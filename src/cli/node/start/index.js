const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./start');

cli('start', 'Start forge as a daemon in the background', input => action(execute, run, input), {
  requirements: {
    forgeRelease: true,
    rpcClient: true,
  },
  options: [
    ['-m, --multiple', 'Allow start multiple forge node instances'],
    ['--dry-run', 'Start in dry-run mode, print the start command'],
  ],
  handlers: {
    '--help': () => {
      shell.echo(`
Examples:
  - ${chalk.cyan('forge start')}              Start forge node, ensure single chain and single node
  - ${chalk.cyan('forge start --dry-run')}    Just print the start command
  - ${chalk.cyan(
    'forge start -m'
  )}        Start multiple chain, must specify process.env.FORGE_CONFIG
        `);
    },
  },
});
