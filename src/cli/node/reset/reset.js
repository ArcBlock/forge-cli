const shell = require('shelljs');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { findServicePid } = require('forge-process');
const { symbols } = require('core/ui');

const { clearDataDirectories } = require('../../../forge-fs');

async function main({ opts: { yes } }) {
  const pid = await findServicePid('forge_starter');
  if (pid) {
    shell.echo(`${symbols.error} forge is running!`);
    shell.echo(`${symbols.info} Please run ${chalk.cyan('forge stop')} first, then we can reset!`);
    process.exit(0);
    return;
  }

  // Confirm
  let confirm = yes;
  if (!yes) {
    const questions = [
      {
        type: 'confirm',
        name: 'confirm',
        default: false,
        message: chalk.red(
          'Reset chain state will erase chain state, logs and configuration are you sure to continue?'
        ),
      },
    ];
    const answers = await inquirer.prompt(questions);
    // eslint-disable-next-line prefer-destructuring
    confirm = answers.confirm;
  }

  if (confirm) {
    clearDataDirectories();
  } else {
    shell.echo(`${symbols.info} User abort, nothing changed!`);
    process.exit();
  }
}

exports.run = main;
exports.execute = main;
