const fs = require('fs');
const toml = require('@iarna/toml');
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
    let configs = toml.parse(
      fs
        .readFileSync(getOriginForgeReleaseFilePath('forge', config.get('cli').currentVersion))
        .toString()
    );
    configs = await askUserConfigs(configs, chainName, true);

    const {
      app: { name },
    } = configs;
    configs = await setConfigToProfile(configs, name);
    createNewProfile(name);
    await writeConfigs(getProfileReleaseFilePath(name), configs);
  } catch (error) {
    printError('Create new chain failed:');
    printError(error);
  }
}

exports.run = main;
exports.execute = main;
