const { config } = require('core/env');
const { setConfigToProfile } = require('core/forge-config');
const { printError } = require('core/util');
const { askUserConfigs, writeConfigs } = require('../config/lib');
const {
  createNewProfile,
  getOriginForgeReleaseFilePath,
  getProfileReleaseFilePath,
} = require('../../../core/forge-fs');

async function main({ args: [chainName = ''] }) {
  try {
    let configs = await askUserConfigs(
      getOriginForgeReleaseFilePath('forge', config.get('cli').currentVersion),
      chainName
    );

    configs = await setConfigToProfile(configs, chainName);
    createNewProfile(chainName);
    await writeConfigs(getProfileReleaseFilePath(chainName), configs);
  } catch (error) {
    printError('Create new chain failed:');
    printError(error);
  }
}

exports.run = main;
exports.execute = main;
