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
const fs = require('fs');
const { getProfileDirectory, ensureProfileDirectory } = require('./core/forge-fs');
const { getAllProcesses } = require('./core/forge-process');

const { printError, printInfo, printLogo, printCurrentChain } = require('./core/util');
const { DEFAULT_CHAIN_NAME } = require('./constant');
const debug = require('./core/debug')('main');
const { symbols, hr } = require('./core/ui');
const checkCompatibility = require('./core/migration');
const { version } = require('../package.json');

const onError = error => {
  debug(error);

  printError(`Exception: ${error.message}`);

  let command = process.argv.length > 2 ? process.argv.slice(2).join(' ') : 'command';
  if (command.indexOf('-v') === -1 && command.indexOf('--verbose')) {
    command += ' -v';
  }

  printInfo(`run ${chalk.cyan(`forge ${command}`)} to get detail infomation`);
};

process.on('unhandledRejection', onError);
process.on('uncaughtException', onError);

const getCurrentChainENV = async (command, action, argsChainName) => {
  let chainName = process.env.FORGE_CURRENT_CHAIN || argsChainName || DEFAULT_CHAIN_NAME;

  const allProcesses = await getAllProcesses();

  if (['start', 'stop', 'reset', 'chain:remove'].includes(command) && action) {
    chainName = action;
  } else if (allProcesses.length >= 1 && !['start', 'join'].includes(command) && !argsChainName) {
    chainName = allProcesses[0].name;
  }

  return chainName;
};

const shouldPrintCurrentChain = (currentChainName, command) => {
  if (['chain:remove'].includes(command)) {
    return false;
  }

  if (currentChainName !== DEFAULT_CHAIN_NAME) {
    return true;
  }

  return false;
};

async function setupEnv() {
  const args = process.argv.slice(2);
  const [command, ...params] = args;

  // parse [--chain-name | -c] arg
  const action = params[0] && !params[0].startsWith('-') ? params[0] : undefined;
  const chainNameIndex = params.findIndex(t => t === '-c' || t === '--chain-name');
  const argsChainName = chainNameIndex > -1 ? params[chainNameIndex + 1] : undefined;

  const chainName = await getCurrentChainENV(command, action, argsChainName);
  process.env.FORGE_CURRENT_CHAIN = chainName;

  if (shouldPrintCurrentChain(process.env.FORGE_CURRENT_CHAIN, command)) {
    printCurrentChain(process.env.FORGE_CURRENT_CHAIN);
  }

  if (
    chainName !== DEFAULT_CHAIN_NAME &&
    !fs.existsSync(getProfileDirectory(chainName)) &&
    command !== 'create-chain'
  ) {
    printError(`Chain ${chainName} does not exist`);
    printInfo(`You can create by run ${chalk.cyan(`forge create-chain ${chainName}`)}`);
    process.exit(-1);
  }
}

const run = async () => {
  ensureProfileDirectory(DEFAULT_CHAIN_NAME);

  program
    .version(version)
    .option('-v, --verbose', 'Output runtime info when execute subcommand, useful for debug')
    .option('-c, --chain-name <chainName>', 'Execute command use specific chain')
    .option(
      '-r, --release-dir <dir>',
      'Forge release directory path (unzipped), use your own copy forge release'
    )
    .option(
      '-f, --config-path <path>',
      'Forge config used when starting forge node and initializing gRPC clients'
    )
    .option('-y, --yes', 'Run command using default values for all questions')
    .option(
      '-g, --socket-grpc <endpoint>',
      'Socket gRPC endpoint to connect, with this you can use forge-cli with a remote node'
    );

  program.on('--help', () => {
    shell.echo(`
Examples:

  Please install a forge-release before running any other commands
  > ${chalk.cyan('forge install latest')}
  > ${chalk.cyan('forge install --mirror http://arcblock.oss-cn-beijing.aliyuncs.com')}

  Curious about how to use a subcommand?
  > ${chalk.cyan('forge help install')}
  `);
  });

  await setupEnv();
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
