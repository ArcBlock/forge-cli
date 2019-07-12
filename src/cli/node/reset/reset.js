const shell = require('shelljs');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { findServicePid } = require('core/env');
const { symbols } = require('core/ui');

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
    shell.exec('rm -rf ~/.forge_release');
    shell.echo(`${symbols.info} rm -rf ~/.forge_release`);
    shell.exec('rm -rf ~/.forge_cli/keys');
    shell.echo(`${symbols.info} rm -rf ~/.forge_cli/keys`);
    shell.exec('rm -f ~/.forge_cli/forge_release.toml');
    shell.echo(`${symbols.info} rm -f ~/.forge_cli/forge_release.toml`);
  } else {
    shell.echo(`${symbols.info} User abort, nothing changed!`);
    process.exit();
  }
}

exports.run = main;
exports.execute = main;
