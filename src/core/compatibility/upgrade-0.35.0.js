const fs = require('fs');
const os = require('os');
const path = require('path');
const shell = require('shelljs');
const TOML = require('@iarna/toml');

const debug = require('../debug')('update-0350');
const { ensureProfileDirectory, getProfileReleaseFilePath } = require('../forge-fs');

const { setConfigToProfile } = require('../forge-config');

const getOldVersionConfigFiles = () => {
  const cliPath = path.join(os.homedir(), '.forge_cli');

  const configPath = path.join(cliPath, 'forge_release.toml');
  const keyFilePath = path.join(cliPath, 'keys');
  const dataPath = path.join(os.homedir(), '.forge_release');

  if (fs.existsSync(configPath)) {
    return { configPath, keyFilePath, dataPath };
  }

  return null;
};

const check = async () => {
  try {
    const appName = 'default';

    const { configPath, keyFilePath, dataPath } = getOldVersionConfigFiles();

    const oldConfigFiles = getOldVersionConfigFiles();
    if (!oldConfigFiles) {
      debug('there is no old version configs');
      return;
    }

    let oldConfigs = TOML.parse(fs.readFileSync(configPath).toString());
    oldConfigs = await setConfigToProfile(oldConfigs, appName);

    const forgeProfileDir = ensureProfileDirectory(appName);
    shell.exec(`mv ${configPath} ${keyFilePath} ${dataPath} ${forgeProfileDir}`);
    fs.writeFileSync(getProfileReleaseFilePath(appName), TOML.stringify(oldConfigs));
  } catch (error) {
    debug('check failed:');
    debug(error);
  }
};

module.exports = check;
