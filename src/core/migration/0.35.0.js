/* eslint no-console:"off" */

const fs = require('fs');
const os = require('os');
const path = require('path');
const shell = require('shelljs');
const TOML = require('@iarna/toml');

const debug = require('../debug')('update-0350');
const { ensureChainDirectory, getChainReleaseFilePath } = require('../forge-fs');

const { setFilePathOfConfig } = require('../forge-config');

const oldReleaseDirName = '.forge_release';

const getOldVersionConfigFiles = () => {
  const cliPath = path.join(os.homedir(), '.forge_cli');

  const configPath = path.join(cliPath, 'forge_release.toml');
  const keyFilePath = path.join(cliPath, 'keys');
  const dataPath = path.join(os.homedir(), oldReleaseDirName);

  if (fs.existsSync(configPath)) {
    return { configPath, keyFilePath, dataPath };
  }

  return null;
};

const check = async () => {
  try {
    const chainName = 'default';

    const oldConfigFiles = getOldVersionConfigFiles();
    if (!oldConfigFiles) {
      debug('there is no old version configs');
      return;
    }

    const { configPath, keyFilePath, dataPath } = oldConfigFiles;

    let oldConfigs = TOML.parse(fs.readFileSync(configPath).toString());
    oldConfigs = await setFilePathOfConfig(oldConfigs, chainName);

    const forgeChainDir = ensureChainDirectory(chainName);
    shell.exec(`rm -rf ${path.join(forgeChainDir, 'forge_release')}`);
    shell.exec(`mv ${dataPath} ${path.join(forgeChainDir, 'forge_release')}`);
    shell.exec(`mv ${configPath} ${keyFilePath} ${forgeChainDir}`);
    fs.writeFileSync(getChainReleaseFilePath(chainName), TOML.stringify(oldConfigs));
    console.log('migration: done!');
  } catch (error) {
    debug('check failed:');
    debug(error);
  }
};

module.exports = check;
