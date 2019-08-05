const fs = require('fs');
const path = require('path');
const os = require('os');
const shell = require('shelljs');
const yaml = require('yaml');

const debug = require('core/debug')('forge-fs');
const { print, printWarning, printInfo, printSuccess, printError } = require('core/util');

const { CONFIG_FILE_NAME, CHAIN_DATA_PATH_NAME } = require('../constant');

const CLI_BASE_DIRECTORY = path.join(os.homedir(), '.forge_cli');
const FORGE_LOG = path.join(os.homedir(), '.forge_release', 'core', 'logs');

const requiredDirs = {
  tmp: path.join(CLI_BASE_DIRECTORY, 'tmp'),
  bin: path.join(CLI_BASE_DIRECTORY, 'bin'),
  cache: path.join(CLI_BASE_DIRECTORY, 'cache'),
  release: path.join(CLI_BASE_DIRECTORY, 'release'),
};

function clearDataDirectories(chainName = process.env.FORGE_CURRENT_CHAIN) {
  printWarning('Cleaning up chain data!');

  const dir = getProfileDirectory(chainName);
  shell.exec(`rm -rf ${dir}`);
  printInfo(`rm -f ${dir}`);

  printSuccess('Data profiles cleaned!');
}

function isDirectory(x) {
  return fs.existsSync(x) && fs.statSync(x).isDirectory();
}

function isFile(x) {
  return fs.existsSync(x) && fs.statSync(x).isFile();
}

function getCurrentWorkingDirectory() {
  return process.env.CURRENT_WORKING_PROFILE;
}

function getForgeDirectory() {
  return path.join(getCurrentWorkingDirectory(), '.forge');
}

function getReleaseDirectory(chainName = process.env.FORGE_CURRENT_CHAIN) {
  return path.join(getProfileDirectory(chainName), CHAIN_DATA_PATH_NAME);
}

function getCurrentReleaseFilePath() {
  return path.join(getCurrentWorkingDirectory(), 'forge_release.toml');
}

function getCliDirectory() {
  return path.join(os.homedir(), '.forge_cli');
}

function getForgeReleaseDirectory() {
  return path.join(getCliDirectory(), 'release', 'forge');
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
  debug('getForgeBinPath');

  return path.join(getForgeReleaseDirectory(), version, 'bin', 'forge');
}

function isForgeBinExists(version) {
  const tmp = getForgeBinPath(version);
  return fs.existsSync(tmp);
}

function getTendermintHomeDir(chainName) {
  return path.join(getReleaseDirectory(chainName), 'tendermint');
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

function getProfileDirectory(chainName = process.env.FORGE_CURRENT_CHAIN) {
  const forgeRootDir = ensureRootConfigDirectory();
  const forgeProfileDir = path.join(forgeRootDir, `forge_${chainName}`);

  return forgeProfileDir;
}

function getProfileReleaseFilePath(chainName = process.env.FORGE_CURRENT_CHAIN) {
  return path.join(getProfileDirectory(chainName), 'forge_release.toml');
}

function getProfileKeyFilePath(chainName = process.env.FORGE_CURRENT_CHAIN) {
  return path.join(getProfileDirectory(chainName), 'key');
}

function createNewProfile(chainName = process.env.FORGE_CURRENT_CHAIN) {
  const profileDirectory = getProfileDirectory(chainName);
  if (fs.existsSync(profileDirectory)) {
    printError(`The config file ${profileDirectory} has already exists in your current directory.`);

    process.exit(1);
  }

  fs.mkdirSync(getReleaseDirectory(chainName), { recursive: true });
  fs.mkdirSync(path.join(profileDirectory, 'keys'), { recursive: true });
  print(`Initialized an empty storage space in ${profileDirectory}`);
}

function ensureProfileDirectory(chainName = process.env.FORGE_CURRENT_CHAIN) {
  const forgeProfileDir = getProfileDirectory(chainName);

  if (!fs.existsSync(forgeProfileDir)) {
    fs.mkdirSync(forgeProfileDir, { recursive: true });
    fs.mkdirSync(getReleaseDirectory(chainName), { recursive: true });
    fs.mkdirSync(path.join(forgeProfileDir, 'keys'), { recursive: true });
    print(`Initialized an empty storage space in ${forgeProfileDir}`);
  }

  return forgeProfileDir;
}

const getLogfile = filename => (filename ? path.join(FORGE_LOG, filename) : FORGE_LOG);

function getForgeVersionFromYaml(yamlPath) {
  try {
    if (!fs.existsSync(yamlPath)) {
      return '';
    }

    const releaseYamlObj = yaml.parse(fs.readFileSync(yamlPath).toString());
    if (!releaseYamlObj || !releaseYamlObj.current) {
      throw new Error('no current forge release selected');
    }

    return releaseYamlObj.current;
  } catch (err) {
    debug.error(err);
    return '';
  }
}

function getCurrentForgeVersion() {
  const filePath = path.join(getForgeReleaseDirectory(), 'release.yml');

  return getForgeVersionFromYaml(filePath);
}

module.exports = {
  clearDataDirectories,
  createNewProfile,
  ensureProfileDirectory,
  getCliDirectory,
  getConsensusEnginBinPath,
  getCurrentReleaseFilePath,
  getCurrentForgeVersion,
  getForgeBinPath,
  getForgeDirectory,
  getProfileDirectory,
  getProfileReleaseFilePath,
  getReleaseDirectory,
  getLogfile,
  getRootConfigDirectory,
  getTendermintHomeDir,
  getForgeVersionFromYaml,
  getOriginForgeReleaseFilePath,
  getStorageEnginePath,
  getProfileKeyFilePath,
  isForgeBinExists,
  isDirectory,
  isFile,
  requiredDirs,
};
