const shell = require('shelljs');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { clearDataDirectories } = require('core/forge-fs');
const { print } = require('core/util');
const { isForgeStarted } = require('core/forge-process');
const { symbols } = require('core/ui');
const { printError } = require('core/util');

async function main({ opts: { yes }, args: [chainName = process.env.FORGE_CURRENT_CHAIN] }) {
  const isStarted = await isForgeStarted(chainName);
  if (isStarted) {
    printError(
      `${chalk.cyan(
        chainName
      )} chain is running! If you still want to remove it, please run ${chalk.cyan(
        'forge stop'
      )} first!`
    );
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
        message: `${chalk.red('Are you sure to continue remove the')} ${chalk.cyan(
          chainName
        )} ${chalk.red('chain')}?`,
      },
    ];

    print(chalk.red('Remove chain will erase chain state, logs and configuration!'));
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
