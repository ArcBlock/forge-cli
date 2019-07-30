const { config, setConfigToProfile } = require('core/env');
const { printError } = require('core/util');
const { askUserConfigs, writeConfigs } = require('../config/lib');
const {
  createNewProfile,
  getOriginForgeReleaseFilePath,
  getProfileReleaseFilePath,
} = require('../../../core/forge-fs');

async function main({ args: [action = ''] }) {
  try {
    const appName = action || configs.app.name;
    let configs = await askUserConfigs(
      getOriginForgeReleaseFilePath('forge', config.get('cli').currentVersion),
      appName
    );

    configs = await setConfigToProfile(configs, appName);
    createNewProfile(appName);
    await writeConfigs(getProfileReleaseFilePath(appName), configs);
  } catch (error) {
    printError('Create new chain failed:');
    console.log(error);
    printError(error);
  }
}

exports.run = main;
exports.execute = main;
