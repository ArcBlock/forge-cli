const chalk = require('chalk');
const fs = require('fs');
const shell = require('shelljs');
const {
  config,
  runNativeWebCommand,
  runNativeSimulatorCommand,
  runNativeWorkshopCommand,
} = require('core/env');
const debug = require('core/debug')('version');

const { print, printSuccess, getPlatform } = require('core/util');
const { getConsensusEnginBinPath, getStorageEnginePath } = require('core/forge-fs');
const { getChainVersion } = require('core/libs/common');
const { version: forgeCliVersion } = require('../../../../package.json');

async function main({ opts: { chainName } }) {
  const currentVersion = getChainVersion(chainName);

  if (!currentVersion) {
    throw new Error(`invalid chain version, chain: ${chainName}`);
  }

  const { storageEngine = 'ipfs', consensusEngine = 'tendermint' } = config.get('forge');
  const storageEnginePath = getStorageEnginePath(currentVersion);
  const consensusEnginePath = getConsensusEnginBinPath(currentVersion);

  // core
  print(`Versions of ${chalk.cyan(chainName)} chain:`);
  print();
  print(`forge-core version ${currentVersion} on ${await getPlatform()}`);
  print(`forge-cli version ${forgeCliVersion}`);

  // components
  runNativeWebCommand('version')();
  runNativeSimulatorCommand('version')();
  runNativeWorkshopCommand('version')();

  // ipfs
  if (fs.e) {
    debug(`storage engine path: ${storageEnginePath}`);
    const { code, stdout, stderr } = shell.exec(`${storageEnginePath} version`, { silent: true });
    if (code === 0) {
      print(`storage engine: ${stdout.trim()}`);
    } else {
      debug(`${storageEngine} version error: ${stderr.trim()}`);
    }
  }

  // tendermint
  if (consensusEnginePath) {
    debug(`storage engine path: ${consensusEnginePath}`);
    const { code, stdout, stderr } = shell.exec(`${consensusEnginePath} version`, { silent: true });
    if (code === 0) {
      print(`consensus engine: ${consensusEngine} version ${stdout.trim()}`);
    } else {
      debug(`${consensusEngine} version error: ${stderr.trim()}`);
    }
  }

  const app = config.get('app');
  if (app && app.name && app.version) {
    printSuccess(`app: ${app.name} version ${app.version}`);
  }
}

exports.run = main;
exports.execute = main;
