const fs = require('fs');
const path = require('path');
const os = require('os');
const shell = require('shelljs');
const yaml = require('yaml');
const semver = require('semver');

const debug = require('core/debug')('forge-fs');
const {
  print,
  printWarning,
  printInfo,
  printSuccess,
  printError,
  chainSortHandler,
} = require('core/util');

const { CONFIG_FILE_NAME, CHAIN_DATA_PATH_NAME } = require('../constant');

const CLI_BASE_DIRECTORY = path.join(os.homedir(), '.forge_cli');

const requiredDirs = {
  tmp: path.join(CLI_BASE_DIRECTORY, 'tmp'),
  bin: path.join(CLI_BASE_DIRECTORY, 'bin'),
  cache: path.join(CLI_BASE_DIRECTORY, 'cache'),
  release: path.join(CLI_BASE_DIRECTORY, 'release'),
};

function clearDataDirectories(chainName = process.env.FORGE_CURRENT_CHAIN) {
  printWarning('Cleaning up chain data!');

  const dir = getChainDirectory(chainName);
  shell.exec(`rm -rf ${dir}`);
  printInfo(`rm -f ${dir}`);

  printSuccess('Chain data cleaned!');
}

function isDirectory(x) {
  return fs.existsSync(x) && fs.statSync(x).isDirectory();
}

function isFile(x) {
  return fs.existsSync(x) && fs.statSync(x).isFile();
}

function getAllAppDirectories() {
  const rootConfigDirectory = getRootConfigDirectory();

  return fs
    .readdirSync(rootConfigDirectory)
    .filter(tmp => tmp.startsWith('forge'))
    .filter(tmp => isDirectory(path.join(rootConfigDirectory, tmp)));
}

function getAllChainNames() {
  return getAllAppDirectories()
    .map(name => name.slice(name.indexOf('_') + 1))
    .sort(chainSortHandler)
    .map(x => [x, getChainConfig(x)]);
}

function getCurrentWorkingDirectory() {
  return process.env.CURRENT_WORKING_CHAIN;
}

function getDataDirectory(chainName = process.env.FORGE_CURRENT_CHAIN) {
  return path.join(getChainDirectory(chainName), CHAIN_DATA_PATH_NAME);
}

function getCurrentReleaseFilePath() {
  return path.join(getCurrentWorkingDirectory(), 'forge_release.toml');
}

function getCliDirectory() {
  return path.join(os.homedir(), '.forge_cli');
}

function getReleaseDirectory(name, version) {
  const releaseRoot = path.join(getCliDirectory(), 'release', name);
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

function getForgeWorkshopReleaseDirectory(version) {
  return getReleaseDirectory('forge_workshop', version);
}

function getForgeSimulatorReleaseDirectory(version) {
  return getReleaseDirectory('simulator', version);
}

function getOriginForgeReleaseFilePath(version) {
  debug('getOriginForgeReleaseFilePath');

  return path.join(
    getForgeReleaseDirectory(),
    version,
    'lib',
    `forge-${version}`,
    'priv',
    'forge_release.toml'
  );
}

function getConsensusEnginBinPath(version) {
  return path.join(
    getForgeReleaseDirectory(),
    version,
    'lib',
    `consensus-${version}`,
    'priv',
    'tendermint'
  );
}

function getStorageEnginePath(version) {
  return path.join(
    getForgeReleaseDirectory(),
    version,
    'lib',
    `storage-${version}`,
    'priv',
    'ipfs'
  );
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

function isForgeBinExists(version) {
  const tmp = getForgeBinPath(version);
  return fs.existsSync(tmp);
}

function getTendermintHomeDir(chainName) {
  return path.join(getDataDirectory(chainName), 'tendermint');
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
  return path.join(getChainDirectory(chainName), 'forge_release.toml');
}

function getChainKeyFilePath(chainName = process.env.FORGE_CURRENT_CHAIN) {
  return path.join(getChainDirectory(chainName), 'keys');
}

function getChainReleaseDirectory(chainName = process.env.FORGE_CURRENT_CHAIN) {
  return path.join(getChainDirectory(chainName), 'forge_release');
}

function getChainWorkshopDirectory(chainName = process.env.FORGE_CURRENT_CHAIN) {
  return path.join(getChainDirectory(chainName), 'workshop');
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
  print(`Initialized a new empty chain in ${chainDirectory}`);
}

function ensureChainDirectory(chainName = process.env.FORGE_CURRENT_CHAIN) {
  const forgeChainDir = getChainDirectory(chainName);

  if (!fs.existsSync(forgeChainDir)) {
    fs.mkdirSync(forgeChainDir, { recursive: true });
    fs.mkdirSync(getDataDirectory(chainName), { recursive: true });
    fs.mkdirSync(path.join(forgeChainDir, 'keys'), { recursive: true });
    updateChainConfig(chainName, { version: getGlobalForgeVersion() });
    print(`Initialized an empty storage space in ${forgeChainDir}`);
  }

  return forgeChainDir;
}

function getLogfile(chainName = process.env.FORGE_CURRENT_CHAIN, fileName) {
  return path.join(getChainReleaseDirectory(chainName), 'core', 'logs', fileName);
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
  return path.join(getChainDirectory(chainName), 'config.yml');
}

function getChainConfig(chainName) {
  const filePath = path.join(getChainDirectory(chainName), 'config.yml');
  try {
    return fs.existsSync(filePath) ? yaml.parse(fs.readFileSync(filePath).toString()) || {} : {};
  } catch (err) {
    // Do nothing
    return {};
  }
}

/**
 * Read config from yaml file.
 * @param {string} filePath
 * @returns {json} return config of json format, if config is empty, return empty json object.
 */
function readYamlConfig(filePath) {
  const yamlObj = fs.existsSync(filePath)
    ? yaml.parse(fs.readFileSync(filePath).toString()) || {}
    : {};

  return yamlObj;
}

function updateChainConfig(chainName, config = {}) {
  try {
    const filePath = getChainConfigPath(chainName);
    debug('updateChainConfig', { chainName, config });

    const chainConfig = readYamlConfig(filePath);
    fs.writeFileSync(filePath, yaml.stringify(Object.assign(chainConfig, config)), { flag: 'w+' });
  } catch (err) {
    printError(err);
  }
}

module.exports = {
  clearDataDirectories,
  createNewChain,
  ensureChainDirectory,
  getAllAppDirectories,
  getAllChainNames,
  getCliDirectory,
  getConsensusEnginBinPath,
  getCurrentReleaseFilePath,
  getDataDirectory,
  getForgeBinPath,
  getChainDirectory,
  getChainConfigPath,
  getChainConfig,
  getForgeSimulatorReleaseDirectory,
  getForgeWebReleaseDirectory,
  getForgeWorkshopReleaseDirectory,
  getGlobalForgeVersion,
  getChainReleaseFilePath,
  getChainWorkshopDirectory,
  getLogfile,
  getRootConfigDirectory,
  getTendermintHomeDir,
  getForgeVersionFromYaml,
  getOriginForgeReleaseFilePath,
  getForgeReleaseDirectory,
  getStorageEnginePath,
  getChainKeyFilePath,
  isForgeBinExists,
  isDirectory,
  isFile,
  requiredDirs,
  updateReleaseYaml,
  updateChainConfig,
};
