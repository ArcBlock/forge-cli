#!/usr/bin/env node

/* eslint no-console:"off" */

// Add the root project directory to the app module search path:
if (process.argv.some(x => x === '--verbose' || x === '-v')) {
  process.env.FORGE_DEBUG = '@arcblock/cli*';
}

require('app-module-path').addPath(__dirname);

const chalk = require('chalk');
const shell = require('shelljs');
const program = require('commander');
const path = require('path');

const { print, printError, printInfo, printLogo } = require('./core/util');
const { REQUIRED_DIRS } = require('./constant');
const debug = require('./core/debug')('main');
const { hr } = require('./core/ui');
const checkCompatibility = require('./core/migration');
const getSuggest = require('./core/suggest');
const { version } = require('../package.json');

const onError = error => {
  debug(error);

  printError(error);

  let command = process.argv.length > 2 ? process.argv.slice(2).join(' ') : 'command';
  if (command.indexOf('-v') === -1 && command.indexOf('--verbose')) {
    command += ' -v';
  }

  printInfo(`Run ${chalk.cyan(`forge ${command}`)} to debug`);
  printInfo(
    `Logs of this run can be found in ${chalk.cyan(
      path.join(path.join(REQUIRED_DIRS.logs, 'error.log'))
    )}`
  );
  process.exit(1);
};

process.on('unhandledRejection', onError);
process.on('uncaughtException', onError);

const run = async () => {
  program
    .version(version)
    .option('-v, --verbose', 'Output runtime info when execute subcommand, useful for debug')
    .option('-c, --chain-name <chainName>', 'Execute command use specific chain')
    .option(
      '-i, --config-path <path>',
      'Forge config used when starting forge node and initializing gRPC clients'
    )
    .option('-r, --npm-registry <registry>', 'Specify a custom npm registry')
    .option('-y, --yes', 'Assume that the answer to any confirmation question is yes')
    .option('-d, --defaults', 'Run command using default values for all questions')
    .option('-m, --mirror <url>', 'Mirror host used to download forge release')
    .option(
      '-g, --socket-grpc <endpoint>',
      'Socket gRPC endpoint to connect, with this you can use forge-cli with a remote node'
    );

  program.on('--help', () => {
    shell.echo(`
Examples:

  Please install a forge-release before running any other commands
  > ${chalk.cyan('forge install latest')}
  > ${chalk.cyan('forge install --mirror https://releases.arcblockio.cn')}

  Curious about how to use a subcommand?
  > ${chalk.cyan('forge help install')}
  `);
  });

  const { initCli } = require('./core/cli'); // eslint-disable-line
  initCli(program);

  program.on('command:*', () => {
    // eslint-disable-next-line no-underscore-dangle
    const commands = program.commands.map(x => x._name);
    const keyword = program.args[0];

    print(hr);
    printError(`'${keyword}' is not a valid subcommand. See '${chalk.cyan('forge --help')}'`);
    print(hr);

    const suggestions = getSuggest(commands, keyword);
    if (suggestions.length) {
      printInfo('Did you mean this?');
      suggestions.forEach(x => print(`  - ${chalk.cyan(`forge ${x.command}`)}`));
    }
  });

  program.parse(process.argv);

  if (program.args.length === 0) {
    printLogo();
    program.help();
    process.exit(0);
  }
};

checkCompatibility().then(run);
