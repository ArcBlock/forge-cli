const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');
const shell = require('shelljs');
const yaml = require('yaml');
const semver = require('semver');
const isEqual = require('lodash/isEqual');
const get = require('lodash/get');
const TOML = require('@iarna/toml');

const debug = require('core/debug')('forge-fs');
const {
  chainSortHandler,
  fetchReleaseAssetsInfo,
  getPlatform,
  print,
  printWarning,
  printInfo,
  printSuccess,
  printError,
} = require('core/util');

const {
  CHAIN_DATA_PATH_NAME,
  CONFIG_FILE_NAME,
  CLI_BASE_DIRECTORY,
  REQUIRED_DIRS,
} = require('../constant');

function clearDataDirectories(chainName = process.env.FORGE_CURRENT_CHAIN) {
  printWarning(`Cleaning up ${chalk.cyan(chainName)} chain data!`);

  const dir = getChainDirectory(chainName);
  shell.exec(`rm -rf ${dir}`);
  printInfo(`rm -f ${dir}`);

  printSuccess('Chain data cleaned!');
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

async function listReleases() {
  const { release } = REQUIRED_DIRS;
  const platform = await getPlatform();
  const remoteReleasesInfo = (await fetchReleaseAssetsInfo(platform)) || [];
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

  const result = [];

  Object.keys(versionAssetsMap).forEach(version => {
    const tmp = remoteReleasesInfo.find(x => semver.eq(x.version, version));
    if (versionAssetsMap[version] && isEqual(versionAssetsMap[version], tmp.assets)) {
      result.push({ version, assets: versionAssetsMap[version] });
    }
  });

  return result;
}

async function getLocalVersions() {
  const releases = await listReleases();

  const versions = [];
  releases.forEach(({ version }) => {
    versions.push(version);
  });

  return [...new Set(versions)];
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

function isReleaseBinExists(releaseName, version) {
  const releaseBinPath = path.join(getReleaseDirectory(releaseName), version, 'bin', releaseName);
  return fs.existsSync(releaseBinPath);
}

function isForgeBinExists(version) {
  return isReleaseBinExists('forge', version);
}

function getTendermintHomeDir(chainName) {
  const filePath = getChainReleaseFilePath(chainName);
  if (!fs.existsSync(filePath)) {
    return '';
  }

  const config = TOML.parse(fs.readFileSync(filePath).toString());
  return get(config, 'tendermint.path', '');
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
    printSuccess(`Initialized an empty storage space in ${forgeChainDir}`);
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
  const filePath = getChainConfigPath(chainName);
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

/**
 * Check if exit_status.json exists, if it exists, and is less than the startup
 * time (startAtMs), then the content in the file is considered to be the cause
 * of this startup error.
 * @param {*} chainName
 * @param {*} startAtMs
 */
function checkStartError(chainName, startAtMs = Date.now()) {
  return new Promise(resolve => {
    const errorFilePath = getLogfile(chainName, 'exit_status.json');
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

module.exports = {
  clearDataDirectories,
  checkStartError,
  createNewChain,
  ensureChainDirectory,
  getAllAppDirectories,
  getAllChainNames,
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
  getReleaseDir,
  getReleaseAssets,
  getLogfile,
  getRootConfigDirectory,
  getTendermintHomeDir,
  getForgeVersionFromYaml,
  getOriginForgeReleaseFilePath,
  getForgeReleaseDirectory,
  getReleaseDirectory,
  getStorageEnginePath,
  getChainKeyFilePath,
  getLocalVersions,
  isChainExists,
  isEmptyDirectory,
  isForgeBinExists,
  isReleaseBinExists,
  isDirectory,
  isFile,
  listReleases,
  updateReleaseYaml,
  updateChainConfig,
};
