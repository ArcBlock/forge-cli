#!/usr/bin/env node

// Add the root project directory to the app module search path:
require('app-module-path').addPath(__dirname);
const chalk = require('chalk');
const shell = require('shelljs');
const program = require('commander');
const fs = require('fs');
const { getProfileDirectory } = require('core/forge-fs');
const { printError } = require('./common');

const { version } = require('../package.json');

program
  .version(version)
  .option('-v, --verbose', 'Output runtime info when execute subcommand, useful for debug')
  .option(
    '-a, --app-name <appName>',
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

process.env.PROFILE_NAME = program.appName || 'default';

if (
  process.env.PROFILE_NAME !== 'default' &&
  !fs.existsSync(getProfileDirectory(process.env.PROFILE_NAME)) &&
  program.args[0] !== 'init'
) {
  printError(`App ${process.env.PROFILE_NAME} is not exists`);
  process.exit(-1);
}

const { initCli } = require('./core/cli');
const { symbols, hr } = require('./core/ui');
const { printLogo } = require('./core/util');

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
