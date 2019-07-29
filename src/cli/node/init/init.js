const { config } = require('core/env');
const Common = require('../../../common');
const { askUserConfigs, writeConfigs } = require('../config/lib');
const {
  createNewProfile,
  getOriginForgeReleaseFilePath,
  getProfileReleaseFilePath,
} = require('../../../core/forge-fs');

async function main() {
  try {
    const configs = await askUserConfigs(
      getOriginForgeReleaseFilePath('forge', config.get('cli').currentVersion)
    );

    createNewProfile(configs.app.name);
    await writeConfigs(getProfileReleaseFilePath(configs.app.name), configs);
  } catch (error) {
    Common.printError('Initialize failed:');
    Common.printError(error);
  }
}

exports.run = main;
exports.execute = main;
