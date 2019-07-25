const fs = require('fs');
const path = require('path');
const os = require('os');
const shell = require('shelljs');

const { CONFIG_FILE_NAME } = require('../constant');
const { printInfo, printSuccess, printWarning } = require('../common');

function clearDataDirectories() {
  printWarning('Clearing data profiles');

  getDataPath().forEach(filePath => {
    shell.exec(`rm -rf ${filePath}`);
    printInfo(`rm -f ${filePath}`);
  });

  printSuccess('Data profiles cleared!');
}

function getForgeConfigDirectory() {
  const homedir = os.homedir();
  let currentDir = process.cwd();

  if (!currentDir.startsWith(homedir)) {
    return currentDir;
  }

  while (
    currentDir !== homedir &&
    !fs.existsSync(path.join(currentDir, CONFIG_FILE_NAME)) &&
    currentDir.startsWith(homedir)
  ) {
    currentDir = path.join(currentDir, '..');
  }

  if (currentDir === homedir || !currentDir.startsWith(homedir)) {
    return currentDir;
  }

  return path.join(currentDir, CONFIG_FILE_NAME);
}

const WORKING_DIRECTORY = process.env.CURRENT_WORKING_PROFILE || getForgeConfigDirectory();

function getForgeDirectory() {
  return path.join(WORKING_DIRECTORY, '.forge');
}

function getReleaseDirectory() {
  return path.join(WORKING_DIRECTORY, '.forge_release');
}

function getCliDirectory() {
  return path.join(WORKING_DIRECTORY, '.forge_cli');
}

function getForgeRelaseFilePath() {
  return path.join(getCliDirectory(), 'forge_release.toml');
}

function getDataPath() {
  return [
    getReleaseDirectory(),
    path.join(getCliDirectory(), 'keys'),
    path.join(getCliDirectory(), 'forge_release.toml'),
  ];
}

function getTendermintHomeDir() {
  return path.join(WORKING_DIRECTORY, '.forge_release', 'tendermint');
}

const FORGE_LOG = path.join(os.homedir(), '.forge_release', 'core', 'logs');

const getLogfile = filename => (filename ? path.join(FORGE_LOG, filename) : FORGE_LOG);

module.exports = {
  clearDataDirectories,
  getCliDirectory,
  getDataPath,
  getForgeDirectory,
  getReleaseDirectory,
  getForgeRelaseFilePath,
  getForgeConfigDirectory,
  getLogfile,
  getTendermintHomeDir,
};
