const { config, setConfigToProfile } = require('core/env');
const Common = require('../../../common');
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
    Common.printError('Create new chain failed:');
    Common.printError(error);
  }
}

exports.run = main;
exports.execute = main;
