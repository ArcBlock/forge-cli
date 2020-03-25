const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');
const shell = require('shelljs');
const yaml = require('yaml');
const semver = require('semver');
const get = require('lodash/get');
const TOML = require('@iarna/toml');

const debug = require('core/debug')('forge-fs');
const {
  chainSortHandler,
  logError,
  print,
  printWarning,
  printInfo,
  printSuccess,
  printError,
} = require('core/util');

const {
  ABT_NETWORKS_PATH,
  CHAIN_DATA_PATH_NAME,
  CONFIG_FILE_NAME,
  CLI_BASE_DIRECTORY,
  REQUIRED_DIRS,
} = require('../constant');

const getChainNameFromForgeConfig = configPath => {
  const config = TOML.parse(fs.readFileSync(configPath).toString());
  return get(config, 'tendermint.genesis.chain_id', '');
};

const readChainConfigFromEnv = () => {
  const configPath = process.env.FORGE_CONFIG;
  if (configPath && fs.existsSync(configPath)) {
    return { name: getChainNameFromForgeConfig(configPath), configPath };
  }

  return {};
};

const readWebConfigFromEnv = () => {
  const configPath = process.env.FORGE_WEB_CONFIG;
  if (configPath && isFile(configPath)) {
    return configPath;
  }

  return '';
};

const readChainConfig = (chainName, key, defaultValue = '') => {
  let configPath = '';

  try {
    configPath = getChainReleaseFilePath(chainName);
    const config = TOML.parse(fs.readFileSync(configPath).toString());

    if (!key) {
      return config;
    }

    return get(config, key, defaultValue);
  } catch (error) {
    logError(error);
    throw new Error(`read ${chainName} config ${configPath} failed: ${error.message}`);
  }
};

function clearDataDirectories(chainName = process.env.FORGE_CURRENT_CHAIN, keepConfig = false) {
  const doCleanup = dir => {
    shell.exec(`rm -rf ${dir}`);
    printInfo(`rm -f ${dir}`);
  };
  if (keepConfig) {
    printWarning(`Resetting chain ${chalk.cyan(chainName)}`);
    doCleanup(getDataDirectory(chainName));
    doCleanup(readChainKeyFilePath(chainName));
    printSuccess(`Chain ${chalk.cyan(chainName)} is reset`);
  } else {
    printWarning(`Removing chain ${chalk.cyan(chainName)}`);
    doCleanup(getChainDirectory(chainName));
    printSuccess(`Chain ${chalk.cyan(chainName)} is removed`);
  }
}

function isDirectory(x) {
  return fs.existsSync(x) && fs.statSync(x).isDirectory();
}

function isEmptyDirectory(x) {
  return isDirectory(x) && fs.readdirSync(x).length === 0;
}

function isFile(x) {
  return fs.existsSync(x) && fs.statSync(x).isFile();
}

async function getLocalReleases() {
  const { release } = REQUIRED_DIRS;
  const localAllAssetNames = fs.readdirSync(release);
  const versionAssetsMap = {};
  localAllAssetNames.forEach(releaseName => {
    const dir = path.join(release, releaseName);
    if (fs.existsSync(dir)) {
      const versions = fs
        .readdirSync(dir)
        .filter(y => isDirectory(path.join(dir, y)) && !isEmptyDirectory(path.join(dir, y)));

      versions.forEach(v => {
        if (versionAssetsMap[v] === undefined) {
          versionAssetsMap[v] = [];
        }

        if (!versionAssetsMap[v].includes(releaseName)) {
          versionAssetsMap[v].push(releaseName);
        }
      });
    }
  });

  return versionAssetsMap;
}

function backupIncompleteChains(chainFolderNames = []) {
  if (chainFolderNames.length > 0) {
    const rootConfigDirectory = getRootConfigDirectory();
    try {
      chainFolderNames.forEach(folderName => {
        const newFolderName = path.join(rootConfigDirectory, `unknown-${folderName}-${Date.now()}`);
        fs.renameSync(path.join(rootConfigDirectory, folderName), newFolderName);
      });

      printWarning(
        chalk.yellow(`There are unused chain config folders in ${rootConfigDirectory}:`)
      );
      const unknownFolders = fs
        .readdirSync(rootConfigDirectory)
        .filter(dir => dir.startsWith('unknown-forge'));
      print();
      print(unknownFolders.join(os.EOL));
      print();
    } catch (error) {
      printError('Backup unused chain configs failed:');
      printError(error);
    }
  }
}

function getAllAppDirectories() {
  const rootConfigDirectory = getRootConfigDirectory();

  const allChainDirs = fs.readdirSync(rootConfigDirectory).filter(dir => dir.startsWith('forge'));

  const completeChains = allChainDirs.filter(fileName => {
    const chainFolderName = path.join(rootConfigDirectory, fileName);
    return (
      isDirectory(chainFolderName) &&
      fs.existsSync(path.join(chainFolderName, 'forge_release.toml')) &&
      fs.existsSync(path.join(chainFolderName, 'config.yml'))
    );
  });

  const incompleteChians = allChainDirs.filter(fileName => !completeChains.includes(fileName));
  backupIncompleteChains(incompleteChians);

  return completeChains;
}

function getAllChainNames() {
  const chainNames = getAllAppDirectories()
    .map(name => name.slice(name.indexOf('_') + 1))
    .sort(chainSortHandler)
    .map(x => [x, getChainConfig(x)]);

  const { name } = readChainConfigFromEnv();
  if (name) {
    chainNames.push([name, { version: getGlobalForgeVersion() }]);
  }

  return chainNames;
}

function getCurrentWorkingDirectory() {
  return process.env.CURRENT_WORKING_CHAIN;
}

function getDataDirectory(chainName = process.env.FORGE_CURRENT_CHAIN) {
  return path.join(getChainDirectory(chainName), CHAIN_DATA_PATH_NAME);
}

function getCurrentForgeConfigPath() {
  return path.join(getCurrentWorkingDirectory(), 'forge_release.toml');
}

function getCurrentForgeWebConfigPath() {
  return path.join(getCurrentWorkingDirectory(), 'forge_web.toml');
}

function getReleaseDirectory(name, version) {
  const releaseRoot = path.join(CLI_BASE_DIRECTORY, 'release', name);
  if (version) {
    return path.join(releaseRoot, version);
  }

  return releaseRoot;
}

function getForgeReleaseDirectory(version) {
  return getReleaseDirectory('forge', version);
}

function getForgeWebReleaseDirectory(version) {
  return getReleaseDirectory('forge_web', version);
}

function getForgeSimulatorReleaseDirectory(version) {
  return getReleaseDirectory('simulator', version);
}

function getGlobalConfigFilePath() {
  return path.join(os.homedir(), '.forgerc.yml');
}

function getOriginForgeConfigPath(version) {
  debug('getOriginForgeConfigPath');

  return path.join(
    getForgeReleaseDirectory(),
    version,
    'lib',
    `forge-${version}`,
    'priv',
    'forge_release.toml'
  );
}

function getOriginForgeWebConfigPath(version) {
  debug('getOriginWebConfigPath');

  return path.join(
    getForgeWebReleaseDirectory(),
    version,
    'lib',
    `forge_web-${version}`,
    'priv',
    'config/default.toml'
  );
}

function getConsensusEnginBinPath(version) {
  return path.join(
    getForgeReleaseDirectory(),
    version,
    'lib',
    `consensus-${version}`,
    'priv',
    'tendermint',
    'tendermint'
  );
}

function getReleaseBinPath(releaseName, version) {
  return path.join(getReleaseDirectory(releaseName), version, 'bin', releaseName);
}

function getForgeBinPath(version) {
  debug('getForgeBinPath, version:', version);

  return path.join(getForgeReleaseDirectory(), version, 'bin', 'forge');
}

function getGlobalForgeVersion() {
  const filePath = path.join(getReleaseDirectory('forge'), 'release.yml');
  const curVersion = getForgeVersionFromYaml(filePath, 'current');
  if (semver.valid(curVersion)) {
    return curVersion;
  }

  return '';
}

function isReleaseBinExists(releaseName, version) {
  const releaseBinPath = path.join(getReleaseDirectory(releaseName), version, 'bin', releaseName);
  return fs.existsSync(releaseBinPath);
}

function isForgeBinExists(version) {
  return isReleaseBinExists('forge', version);
}

function readTendermintHomeDir(chainName) {
  return readChainConfig(chainName, 'tendermint.path', '');
}

function getRootConfigDirectory() {
  return path.join(os.homedir(), CONFIG_FILE_NAME);
}

function ensureRootConfigDirectory() {
  const dir = getRootConfigDirectory();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;
}

function getChainDirectory(chainName = process.env.FORGE_CURRENT_CHAIN) {
  const forgeRootDir = ensureRootConfigDirectory();
  const forgeChainDir = path.join(forgeRootDir, `forge_${chainName}`);

  return forgeChainDir;
}

function getChainReleaseFilePath(chainName = process.env.FORGE_CURRENT_CHAIN) {
  const { name, configPath } = readChainConfigFromEnv();
  if (name === chainName) {
    return configPath;
  }

  return path.join(getChainDirectory(chainName), 'forge_release.toml');
}

function getChainWebConfigPath(chainName = process.env.FORGE_CURRENT_CHAIN) {
  const configPath = readWebConfigFromEnv();
  if (configPath) {
    return configPath;
  }

  return path.join(getChainDirectory(chainName), 'forge_web.toml');
}

function readChainKeyFilePath(chainName = process.env.FORGE_CURRENT_CHAIN) {
  return readChainConfig(chainName, 'tendermint.keypath');
}

function createNewChain(chainName = process.env.FORGE_CURRENT_CHAIN) {
  const chainDirectory = getChainDirectory(chainName);
  if (fs.existsSync(chainDirectory)) {
    printError(`The config file ${chainDirectory} has already exists in your current directory.`);

    process.exit(1);
  }

  fs.mkdirSync(getDataDirectory(chainName), { recursive: true });
  fs.mkdirSync(path.join(chainDirectory, 'keys'), { recursive: true });
  updateChainConfig(chainName, { version: getGlobalForgeVersion() });
}

function ensureChainDirectory(chainName = process.env.FORGE_CURRENT_CHAIN) {
  const forgeChainDir = getChainDirectory(chainName);

  if (!fs.existsSync(forgeChainDir)) {
    fs.mkdirSync(forgeChainDir, { recursive: true });
    fs.mkdirSync(getDataDirectory(chainName), { recursive: true });
    fs.mkdirSync(path.join(forgeChainDir, 'keys'), { recursive: true });
    updateChainConfig(chainName, { version: getGlobalForgeVersion() });
    printSuccess(`Initialized an empty storage space in ${forgeChainDir}`);
  }

  return forgeChainDir;
}

function readLogPath(chainName = process.env.FORGE_CURRENT_CHAIN, fileName) {
  const forgePath = readChainConfig(chainName, 'forge.path');
  const logPath = readChainConfig(chainName, 'forge.logs');

  return path.join(forgePath, logPath, fileName);
}

function getForgeVersionFromYaml(yamlPath, key = 'current') {
  try {
    if (!fs.existsSync(yamlPath)) {
      return '';
    }

    const releaseYamlObj = yaml.parse(fs.readFileSync(yamlPath).toString());
    if (!releaseYamlObj || !releaseYamlObj[key]) {
      throw new Error('no current forge release selected');
    }

    return releaseYamlObj[key];
  } catch (err) {
    debug.error(err);
    return '';
  }
}

function updateReleaseYaml(asset, version) {
  try {
    const filePath = path.join(getReleaseDirectory(asset), 'release.yml');
    shell.exec(`touch ${filePath}`, { silent: true });
    debug('updateReleaseYaml', { asset, version, filePath });
    const yamlObj = fs.existsSync(filePath)
      ? yaml.parse(fs.readFileSync(filePath).toString()) || {}
      : {};
    if (yamlObj.current) {
      yamlObj.old = yamlObj.current;
    }
    yamlObj.current = version;
    fs.writeFileSync(filePath, yaml.stringify(yamlObj), { flag: 'w+' });
  } catch (err) {
    printError(err);
  }
}

function getChainConfigPath(chainName) {
  const { name, configPath } = readChainConfigFromEnv();
  if (name === chainName) {
    return configPath;
  }

  return path.join(getChainDirectory(chainName), 'config.yml');
}

function getChainConfig(chainName) {
  const filePath = getChainConfigPath(chainName);
  debug('chain config', filePath);
  try {
    return fs.existsSync(filePath) ? yaml.parse(fs.readFileSync(filePath).toString()) || {} : {};
  } catch (err) {
    // Do nothing
    return {};
  }
}

function updateChainConfig(chainName, config = {}) {
  try {
    const filePath = getChainConfigPath(chainName);
    debug('updateChainConfig', { chainName, config });

    const chainConfig = getChainConfig(filePath);
    fs.writeFileSync(filePath, yaml.stringify(Object.assign(chainConfig, config)), { flag: 'w+' });
  } catch (err) {
    printError(err);
  }
}

/**
 * Check if exit_status.json exists, if it exists, and is less than the startup
 * time (startAtMs), then the content in the file is considered to be the cause
 * of this startup error.
 * @param {*} chainName
 * @param {*} startAtMs
 */
function checkStartError(chainName, startAtMs = Date.now()) {
  return new Promise(resolve => {
    const errorFilePath = readLogPath(chainName, 'exit_status.json');
    fs.stat(errorFilePath, (err, stats) => {
      if (!err && stats.ctimeMs > startAtMs) {
        try {
          const { status, message } = JSON.parse(fs.readFileSync(errorFilePath).toString());
          return resolve({ status, message });
        } catch (error) {
          printError(error);
          return resolve({ status: 'read_log_error', message: error.message });
        }
      }

      return resolve(null);
    });
  });
}

function getReleaseAssets() {
  const releaseDir = getReleaseDir();
  if (!fs.existsSync(releaseDir)) {
    return [];
  }

  return fs.readdirSync(releaseDir);
}

function getReleaseDir() {
  return path.join(CLI_BASE_DIRECTORY, 'release');
}

function isChainExists(chainName) {
  return fs.existsSync(getChainDirectory(chainName));
}

const addChainHostToNetworkList = ({ name, endpoint }) => {
  let networks = [];
  if (fs.existsSync(ABT_NETWORKS_PATH)) {
    networks = JSON.parse(
      fs
        .readFileSync(ABT_NETWORKS_PATH)
        .toString()
        .trim() || '[]'
    );
  }

  if (networks.find(x => x.name === name)) {
    return;
  }

  networks.push({
    name,
    endpoint,
    abbr: name.substring(0, 2),
    description: 'Development chain node',
    group: 'development',
  });

  fs.writeFileSync(ABT_NETWORKS_PATH, JSON.stringify(networks));
};

/**
 * Remove offline chains hosts from network list
 * @param {*} names running chain names
 */
const cleanChainHostsFromNetworkList = (names = []) => {
  if (!fs.existsSync(ABT_NETWORKS_PATH)) {
    return;
  }

  const networks = JSON.parse(
    fs
      .readFileSync(ABT_NETWORKS_PATH)
      .toString()
      .trim() || '[]'
  ).filter(x => names.includes(x.name));

  fs.writeFileSync(ABT_NETWORKS_PATH, JSON.stringify(networks));
};

module.exports = {
  addChainHostToNetworkList,
  clearDataDirectories,
  checkStartError,
  createNewChain,
  ensureChainDirectory,
  getAllAppDirectories,
  getAllChainNames,
  getChainNameFromForgeConfig,
  getConsensusEnginBinPath,
  getCurrentForgeConfigPath,
  getCurrentForgeWebConfigPath,
  getDataDirectory,
  getForgeBinPath,
  getChainDirectory,
  getChainConfigPath,
  getChainConfig,
  getForgeSimulatorReleaseDirectory,
  getForgeWebReleaseDirectory,
  getGlobalConfigFilePath,
  getGlobalForgeVersion,
  getChainReleaseFilePath,
  getChainWebConfigPath,
  getLocalReleases,
  getReleaseDir,
  getReleaseAssets,
  getReleaseBinPath,
  getRootConfigDirectory,
  readTendermintHomeDir,
  getForgeVersionFromYaml,
  getOriginForgeConfigPath,
  getOriginForgeWebConfigPath,
  getForgeReleaseDirectory,
  getReleaseDirectory,
  readChainKeyFilePath,
  isChainExists,
  isEmptyDirectory,
  isForgeBinExists,
  isReleaseBinExists,
  isDirectory,
  isFile,
  readChainConfig,
  readChainConfigFromEnv,
  cleanChainHostsFromNetworkList,
  updateReleaseYaml,
  updateChainConfig,
};
