#!/usr/bin/env node

/* eslint no-console:"off" */

// Add the root project directory to the app module search path:
require('app-module-path').addPath(__dirname);
const chalk = require('chalk');
const shell = require('shelljs');
const program = require('commander');
const fs = require('fs');
const { getProfileDirectory } = require('core/forge-fs');
const { printError, printInfo, printLogo } = require('./core/util');
const debug = require('./core/debug')('main');
const { version } = require('../package.json');
const { symbols, hr } = require('./core/ui');
const checkCompatibility = require('./core/compatibility');

const onError = error => {
  debug(error);

  printError(`Exception: ${error.message}`);
  printInfo(`run ${chalk.cyan('DEBUG=@arcblock/cli:* command')} to get details infomations`);
};

process.on('unhandledRejection', onError);
process.on('uncaughtException', onError);

const run = () => {
  program
    .version(version)
    .option('-v, --verbose', 'Output runtime info when execute subcommand, useful for debug')
    .option(
      '-c, --chain-name <chainName>',
      'Forge release directory path (unzipped), use your own copy forge release'
    )
    .option(
      '-r, --release-dir <dir>',
      'Forge release directory path (unzipped), use your own copy forge release'
    )
    .option(
      '-c, --config-path <path>',
      'Forge config used when starting forge node and initializing gRPC clients'
    )
    .option(
      '-g, --socket-grpc <endpoint>',
      'Socket gRPC endpoint to connect, with this you can use forge-cli with a remote node'
    );

  program
    .on('--help', () => {
      shell.echo(`
Examples:

  Please install a forge-release before running any other commands
  > ${chalk.cyan('forge install latest')}
  > ${chalk.cyan('forge install --mirror http://arcblock.oss-cn-beijing.aliyuncs.com')}

  Curious about how to use a subcommand?
  > ${chalk.cyan('forge help install')}
  `);
    })
    .parse(process.argv);

  let chainName = process.env.PROFILE_NAME || program.chainName || 'default';

  const [op, action] = program.args;
  if (['start', 'stop', 'reset'].includes(op) && action) {
    chainName = action;
  }

  process.env.PROFILE_NAME = chainName;

  if (chainName !== 'default' && !fs.existsSync(getProfileDirectory(chainName)) && op !== 'new') {
    printError(`Chain ${process.env.PROFILE_NAME} is not exists`);
    printInfo(`You can create by run ${chalk.cyan(`forge new ${chainName}`)}`);
    process.exit(-1);
  }

  const { initCli } = require('./core/cli'); // eslint-disable-line

  initCli(program);
  program.on('command:*', () => {
    shell.echo(hr);
    shell.echo(`${symbols.error} Unsupported command: ${chalk.cyan(program.args.join(' '))}`);
    shell.echo(hr);
    program.help();
    process.exit(1);
  });

  program.parse(process.argv);

  if (program.args.length === 0) {
    printLogo();
    program.help();
    process.exit(0);
  }
};

checkCompatibility().then(run);
