const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./create');

cli(
  'project:create [starterName]',
  'Create a project from forge starter projects',
  input => action(execute, run, input),
  {
    alias: 'create-project',
    requirements: {
      forgeRelease: false,
      runningNode: false,
      rpcClient: false,
      wallet: false,
    },
    options: [
      ['--target <target>', 'Target directory, default is current directory'],
      ['--starterDir <starterDir>', 'Local boilerplate directory'],
      ['--registry <registry>', 'Only for npm package'],
    ],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan(
    'forge project:create forge-react-starter'
  )}           create a project by forge-react-starter template interactively
  - ${chalk.cyan(
    'forge project:create forge-react-starter --yes'
  )}      create a project by forge-react-starter template with default settings
        `);
      },
    },
  }
);
