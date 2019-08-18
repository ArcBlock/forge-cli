const shell = require('shelljs');
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { execute, run } = require('./create');

cli(
  'project:create [targetDir]',
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
      ['-y, --yes', 'Use default value for all options'],
      ['--target <target>', 'Target directory, default is current directory'],
      ['--starterDir <starterDir>', 'Local boilerplate directory'],
      ['--registry <registry>', 'Only for npm package'],
    ],
    handlers: {
      '--help': () => {
        shell.echo(`
Examples:
  - ${chalk.cyan('forge create-project')}           create a project interactively
  - ${chalk.cyan('forge create-project --yes')}      create a project with default settings
        `);
      },
    },
  }
);
