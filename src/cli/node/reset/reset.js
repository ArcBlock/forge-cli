const shell = require('shelljs');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { clearDataDirectories } = require('core/forge-fs');
const { print } = require('core/util');
const { isForgeStarted } = require('core/forge-process');
const { symbols } = require('core/ui');

async function main({ opts: { yes }, args: [chainName = process.env.PROFILE_NAME] }) {
  const isStarted = await isForgeStarted();
  if (isStarted) {
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
        message: `${chalk.red('Are you sure to continue reset the')} ${chalk.cyan(
          chainName
        )} ${chalk.red('chain')}?`,
      },
    ];

    print(chalk.red('Reset chain state will erase chain state, logs and configuration!'));
    const answers = await inquirer.prompt(questions);
    // eslint-disable-next-line prefer-destructuring
    confirm = answers.confirm;
  }

  if (confirm) {
    clearDataDirectories(chainName);
  } else {
    shell.echo(`${symbols.info} User abort, nothing changed!`);
    process.exit();
  }
}

exports.run = main;
exports.execute = main;
