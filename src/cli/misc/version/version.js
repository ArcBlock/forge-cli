const fs = require('fs');
const shell = require('shelljs');
const {
  config,
  getPlatform,
  runNativeWebCommand,
  runNativeSimulatorCommand,
  runNativeWorkshopCommand,
} = require('core/env');
const debug = require('core/debug')('version');
const { symbols } = require('core/ui');

const { getConsensusEnginBinPath, getStorageEnginePath } = require('core/forge-fs');
const { version: forgeCliVersion } = require('../../../../package.json');

async function main() {
  const { currentVersion } = config.get('cli');
  const { storageEngine = 'ipfs', consensusEngine = 'tendermint' } = config.get('forge');
  const storageEnginePath = getStorageEnginePath(currentVersion);
  const consensusEnginePath = getConsensusEnginBinPath(currentVersion);

  // core
  shell.echo(`forge-core version ${currentVersion} on ${await getPlatform()}`);
  shell.echo(`forge-cli version ${forgeCliVersion}`);

  // components
  runNativeWebCommand('version')();
  runNativeSimulatorCommand('version')();
  runNativeWorkshopCommand('version')();

  // ipfs
  if (fs.e) {
    debug(`storage engine path: ${storageEnginePath}`);
    const { code, stdout, stderr } = shell.exec(`${storageEnginePath} version`, { silent: true });
    if (code === 0) {
      shell.echo(`storage engine: ${stdout.trim()}`);
    } else {
      debug(`${storageEngine} version error: ${stderr.trim()}`);
    }
  }

  // tendermint
  if (consensusEnginePath) {
    debug(`storage engine path: ${consensusEnginePath}`);
    const { code, stdout, stderr } = shell.exec(`${consensusEnginePath} version`, { silent: true });
    if (code === 0) {
      shell.echo(`consensus engine: ${consensusEngine} version ${stdout.trim()}`);
    } else {
      debug(`${consensusEngine} version error: ${stderr.trim()}`);
    }
  }

  const app = config.get('app');
  if (app && app.name && app.version) {
    shell.echo(`${symbols.success} app: ${app.name} version ${app.version}`);
  }
}

exports.run = main;
exports.execute = main;
