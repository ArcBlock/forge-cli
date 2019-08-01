#!/usr/bin/env node

/* eslint no-console:"off" */

// Add the root project directory to the app module search path:
require('app-module-path').addPath(__dirname);
const chalk = require('chalk');
const shell = require('shelljs');
const program = require('commander');
const fs = require('fs');
const { getProfileDirectory, ensureProfileDirectory } = require('./core/forge-fs');
const { getAllProcesses } = require('./core/forge-process');

const { printError, printInfo, printLogo } = require('./core/util');
const { DEFAULT_CHAIN_NAME } = require('./constant');
const debug = require('./core/debug')('main');
const { symbols, hr } = require('./core/ui');
const checkCompatibility = require('./core/compatibility');
const { version } = require('../package.json');

const onError = error => {
  debug(error);

  printError(`Exception: ${error.message}`);
  printInfo(`run ${chalk.cyan('DEBUG=@arcblock/cli:* command')} to get details infomations`);
};

process.on('unhandledRejection', onError);
process.on('uncaughtException', onError);

const printCurrentChain = currentChainName => {
  shell.echo(hr);
  shell.echo(`${symbols.success} Current Chain: ${chalk.cyan(currentChainName)}`);
  shell.echo(hr);
};

const getCurrentChainENV = async (command, action) => {
  let chainName = process.env.PROFILE_NAME || program.chainName || DEFAULT_CHAIN_NAME;

  const allProcesses = await getAllProcesses();

  if (['start', 'stop', 'reset'].includes(command) && action) {
    chainName = action;
  } else if (allProcesses.length === 1 && command !== 'start') {
    chainName = allProcesses[0].name;
  }

  return chainName;
};

const run = async () => {
  ensureProfileDirectory(DEFAULT_CHAIN_NAME);

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

  const [command, action] = program.args;
  const chainName = await getCurrentChainENV(command, action);
  process.env.PROFILE_NAME = chainName;

  if (process.env.PROFILE_NAME !== DEFAULT_CHAIN_NAME) {
    printCurrentChain(process.env.PROFILE_NAME);
  }

  if (
    chainName !== DEFAULT_CHAIN_NAME &&
    !fs.existsSync(getProfileDirectory(chainName)) &&
    command !== 'create-chain'
  ) {
    printError(`Chain ${chainName} is not exists`);
    printInfo(`You can create by run ${chalk.cyan(`forge create-chain ${chainName}`)}`);
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
