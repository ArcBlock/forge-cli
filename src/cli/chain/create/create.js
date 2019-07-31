const { config } = require('core/env');
const { setConfigToProfile } = require('core/forge-config');
const { printError } = require('core/util');
const {
  createNewProfile,
  getOriginForgeReleaseFilePath,
  getProfileReleaseFilePath,
} = require('core/forge-fs');
const { askUserConfigs, writeConfigs } = require('../../node/config/lib');

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
