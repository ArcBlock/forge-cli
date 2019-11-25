/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const fsExtra = require('fs-extra');
const semver = require('semver');
const URL = require('url');
const debug = require('core/debug')('install');
const { getSpinner } = require('core/ui');
const { printError, printInfo, printSuccess, printWarning } = require('core/util');
const { getReleaseAssets, getReleaseDirectory, isReleaseBinExists } = require('core/forge-fs');

const { DEFAULT_MIRROR } = require('../../../../constant');
const HttpAsset = require('./http-asset');
const FSAsset = require('./fs-asset');

const DOWNLOAD_FLAGS = {
  SUCCESS: 0,
  FAILED: 1,
  NOT_FOUND: 2,
  ALREADY_EXISTS: 3,
};

function getUnDownloadReleases({ downloadVersion, whitelistAssets = [], versionAssets }) {
  if (whitelistAssets.length === 0) {
    return versionAssets;
  }

  const unDownloadReleases = whitelistAssets.filter(
    x => versionAssets.some(a => a.indexOf(x) >= 0) && !isReleaseBinExists(x, downloadVersion)
  );

  return unDownloadReleases;
}

function clearLocalAssets(assets = [], version) {
  if (assets.length > 0) {
    printWarning('Cleaning local assets...');
    assets.forEach(asset => {
      const assetPath = getReleaseDirectory(asset, version);
      fsExtra.removeSync(assetPath);
      debug('cleaned local asset', assetPath);
    });
    printSuccess('Cleaned local assets!');
  }
}

/**
 * @param {*} options
 * @return {DOWNLOAD_FLAGS}
 */
async function download(asset, { whitelistAssets, force, isLatest }) {
  if (asset.baseUri && asset.baseUri !== DEFAULT_MIRROR) {
    printInfo(`${chalk.yellow(`Using custom mirror: ${asset.baseUri}`)}`);
  }

  const versionAssets = await asset.getAllAssets();
  const { version } = asset;

  if (versionAssets.length === 0) {
    printError(
      `Version ${version} is not found, please run ${chalk.cyan(
        'forge ls:remote'
      )} to browse available versions.`
    );

    return DOWNLOAD_FLAGS.NOT_FOUND;
  }

  if (isLatest) {
    printInfo(`Download latest version: v${version}`);
  }

  if (force === true) {
    clearLocalAssets(getReleaseAssets(), version);
  }

  const unDownloadReleases = getUnDownloadReleases({
    whitelistAssets,
    downloadVersion: version,
    versionAssets,
  });

  if (unDownloadReleases.length === 0) {
    printInfo(`Forge v${version} is already installed!`);

    return DOWNLOAD_FLAGS.ALREADY_EXISTS;
  }

  const isSuccess = await asset.downloadReleases(unDownloadReleases);

  return isSuccess ? DOWNLOAD_FLAGS.SUCCESS : DOWNLOAD_FLAGS.FAILED;
}
const fetchLatest = async () => {
  const spinner = getSpinner('Fetching forge release version...');
  spinner.start();

  try {
    const url = URL.resolve(DEFAULT_MIRROR, 'forge/latest.json');
    debug('latest.json url:', url);
    const resp = await axios.get(url);
    debug('latest.json response:', resp.data);

    const { latest: version } = resp.data;
    spinner.succeed(`Latest forge release version: v${version}`);
    return version;
  } catch (err) {
    spinner.fail(`Release version fetch error: ${err.message}`);
    throw err;
  }
};

async function formatVersion(version) {
  if (!version || version === 'latest') {
    const latestVersion = await fetchLatest();

    return { isLatest: true, version: latestVersion };
  }

  const cleanedVersion = semver.clean(version);
  if (!cleanedVersion) {
    return { version, isLatest: false }; // just for consistency
  }

  return { version: cleanedVersion, isLatest: false };
}

const createAsset = ({ mirror, version, platform }) => {
  if (fs.existsSync(mirror)) {
    return new FSAsset({ baseUri: mirror, version, platform });
  }

  return new HttpAsset({ baseUri: mirror, version, platform });
};

module.exports = {
  formatVersion,
  createAsset,
  download,
  DOWNLOAD_FLAGS,
};
