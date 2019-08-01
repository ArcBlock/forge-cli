const fs = require('fs');
const path = require('path');
const os = require('os');
const shell = require('shelljs');

const debug = require('core/debug')('forge-fs');
const { print, printWarning, printInfo, printSuccess, printError } = require('core/util');

const { CONFIG_FILE_NAME, CHAIN_DATA_PATH_NAME } = require('../constant');

function clearDataDirectories(chainName = process.env.PROFILE_NAME) {
  printWarning('Clearing data profiles');

  const dir = getProfileDirectory(chainName);
  shell.exec(`rm -rf ${dir}`);
  printInfo(`rm -f ${dir}`);

  printSuccess('Data profiles cleared!');
}

function isDirectory(x) {
  return fs.existsSync(x) && fs.statSync(x).isDirectory();
}

function getCurrentWorkingDirectory() {
  return process.env.CURRENT_WORKING_PROFILE;
}

function getForgeDirectory() {
  return path.join(getCurrentWorkingDirectory(), '.forge');
}

function getReleaseDirectory(chainName = process.env.PROFILE_NAME) {
  return path.join(getProfileDirectory(chainName), CHAIN_DATA_PATH_NAME);
}

function getCurrentReleaseFilePath() {
  return path.join(getCurrentWorkingDirectory(), 'forge_release.toml');
}

function getCliDirectory() {
  return path.join(os.homedir(), '.forge_cli');
}

function getForgeReleaseDirectory() {
  return path.join(getCliDirectory(), 'release');
}

function getOriginForgeReleaseFilePath(name, version) {
  debug('getOriginForgeReleaseFilePath');

  return path.join(
    getForgeReleaseDirectory(),
    name,
    version,
    'lib',
    `forge-${version}`,
    'priv',
    'forge_release.toml'
  );
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

function getProfileDirectory(chainName = process.env.PROFILE_NAME) {
  const forgeRootDir = ensureRootConfigDirectory();
  const forgeProfileDir = path.join(forgeRootDir, `forge_${chainName}`);

  return forgeProfileDir;
}

function getProfileReleaseFilePath(chainName = process.env.PROFILE_NAME) {
  return path.join(getProfileDirectory(chainName), 'forge_release.toml');
}

function createNewProfile(chainName = process.env.PROFILE_NAME) {
  const profileDirectory = getProfileDirectory(chainName);
  if (fs.existsSync(profileDirectory)) {
    printError(`The config file ${profileDirectory} has already exists in your current directory.`);

    process.exit(1);
  }

  fs.mkdirSync(getReleaseDirectory(chainName), { recursive: true });
  fs.mkdirSync(path.join(profileDirectory, 'keys'), { recursive: true });
  print(`Initialized an empty storage space in ${profileDirectory}`);
}

function ensureProfileDirectory(chainName = process.env.PROFILE_NAME) {
  const forgeProfileDir = getProfileDirectory(chainName);

  if (!fs.existsSync(forgeProfileDir)) {
    fs.mkdirSync(forgeProfileDir, { recursive: true });
    fs.mkdirSync(getReleaseDirectory(chainName), { recursive: true });
    fs.mkdirSync(path.join(forgeProfileDir, 'keys'), { recursive: true });
    print(`Initialized an empty storage space in ${forgeProfileDir}`);
  }

  return forgeProfileDir;
}

const FORGE_LOG = path.join(os.homedir(), '.forge_release', 'core', 'logs');

const getLogfile = filename => (filename ? path.join(FORGE_LOG, filename) : FORGE_LOG);

module.exports = {
  clearDataDirectories,
  createNewProfile,
  ensureProfileDirectory,
  getCliDirectory,
  getCurrentReleaseFilePath,
  getForgeDirectory,
  getProfileDirectory,
  getProfileReleaseFilePath,
  getReleaseDirectory,
  getLogfile,
  getRootConfigDirectory,
  getTendermintHomeDir,
  getOriginForgeReleaseFilePath,
  isDirectory,
};
