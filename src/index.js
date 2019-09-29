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
const path = require('path');
const { getChainDirectory, ensureChainDirectory } = require('./core/forge-fs');
const { getAllProcesses } = require('./core/forge-process');

const { printError, printInfo, printLogo, printCurrentChain } = require('./core/util');
const { DEFAULT_CHAIN_NAME, REQUIRED_DIRS } = require('./constant');
const tabtab = require('./core/tabtab');
const debug = require('./core/debug')('main');
const { symbols, hr } = require('./core/ui');
const checkCompatibility = require('./core/migration');
const { version } = require('../package.json');

const onError = error => {
  debug(error);

  printError(error);

  let command = process.argv.length > 2 ? process.argv.slice(2).join(' ') : 'command';
  if (command.indexOf('-v') === -1 && command.indexOf('--verbose')) {
    command += ' -v';
  }

  printInfo(`Run ${chalk.cyan(`forge ${command}`)} to debug`);
  process.exit(1);
};

process.on('exit', code => {
  if (code !== 0) {
    printInfo(
      `Logs of this run can be found in ${chalk.cyan(
        path.join(path.join(REQUIRED_DIRS.logs, 'error.log'))
      )}`
    );
  }
});

process.on('unhandledRejection', onError);
process.on('uncaughtException', onError);

const getCurrentChainENV = async (command, action, argsChainName) => {
  let chainName = process.env.FORGE_CURRENT_CHAIN || argsChainName || DEFAULT_CHAIN_NAME;
  debug(
    'getCurrentChainENV, init env:',
    process.env.FORGE_CURRENT_CHAIN,
    argsChainName,
    DEFAULT_CHAIN_NAME
  );

  const allProcesses = await getAllProcesses();

  if (['start', 'stop', 'reset', 'chain:remove', 'upgrade'].includes(command) && action) {
    chainName = action;
  } else if (allProcesses.length >= 1 && !['start', 'join'].includes(command) && !argsChainName) {
    chainName = allProcesses[0].name;
  }

  debug('getCurrentChainENV, current env:', chainName);
  return chainName;
};

const shouldPrintCurrentChain = (currentChainName, command) => {
  if (
    ['chain:remove', 'protocol:compile', 'chain:create', 'ls:remote', 'ls', 'help'].includes(
      command
    )
  ) {
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

  // If process.env.FORGE_CURRENT_CHAIN is undefined, the chain is not printed before
  if (
    process.env.FORGE_CURRENT_CHAIN === undefined &&
    shouldPrintCurrentChain(chainName, command)
  ) {
    printCurrentChain(chainName);
  }

  process.env.FORGE_CURRENT_CHAIN = chainName;

  if (
    chainName !== DEFAULT_CHAIN_NAME &&
    !fs.existsSync(getChainDirectory(chainName)) &&
    (command !== 'create-chain' || command !== 'chain:create')
  ) {
    printError(`Chain ${chainName} does not exist`);
    printInfo(`You can create by run ${chalk.cyan(`forge chain:create ${chainName}`)}`);
    process.exit(-1);
  }
}

const run = async () => {
  ensureChainDirectory(DEFAULT_CHAIN_NAME);

  program
    .version(version)
    .option('-v, --verbose', 'Output runtime info when execute subcommand, useful for debug')
    .option('-c, --chain-name <chainName>', 'Execute command use specific chain')
    .option(
      '-i, --config-path <path>',
      'Forge config used when starting forge node and initializing gRPC clients'
    )
    .option('-r, --npmRegistry <registry>', 'Specify a custom npm registry')
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
  > ${chalk.cyan('forge install --mirror http://arcblock.oss-cn-beijing.aliyuncs.com')}

  Curious about how to use a subcommand?
  > ${chalk.cyan('forge help install')}
  `);
  });

  await setupEnv();
  const { initCli } = require('./core/cli'); // eslint-disable-line
  initCli(program);

  tabtab.init(program, 'forge');

  program.on('command:*', () => {
    if (program.args.includes('completion') === false) {
      shell.echo(hr);
      shell.echo(`${symbols.error} Unsupported command: ${chalk.cyan(program.args.join(' '))}`);
      shell.echo(hr);
      program.help();
      process.exit(1);
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
