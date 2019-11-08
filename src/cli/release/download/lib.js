/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const os = require('os');
const shell = require('shelljs');
const semver = require('semver');
const tar = require('tar');
const URL = require('url');
const { symbols, getSpinner, getProgress } = require('core/ui');
const {
  fetchAsset,
  print,
  printError,
  printInfo,
  printSuccess,
  printWarning,
} = require('core/util');
const debug = require('core/debug')('install');
const { getReleaseAssets, getReleaseDirectory, isReleaseBinExists } = require('core/forge-fs');

const { ASSETS_PATH, REQUIRED_DIRS } = require('../../../constant');

function fetchReleaseVersion({ mirror, releaseDir }) {
  if (releaseDir && fs.existsSync(releaseDir)) {
    const versions = fs
      .readdirSync(releaseDir)
      .filter(x => semver.valid(x))
      .sort((a, b) => {
        if (semver.gt(a, b)) {
          return -1;
        }
        if (semver.lt(b, a)) {
          return 1;
        }

        return 0;
      });

    if (versions.length) {
      printSuccess(`Latest forge release version: v${versions[0]}`);
      return versions[0];
    }
  }

  const spinner = getSpinner('Fetching forge release version...');
  spinner.start();

  try {
    const url = URL.resolve(mirror, 'forge/latest.json');
    const { code, stdout, stderr } = shell.exec(`curl "${url}"`, { silent: true });
    if (code !== 0) {
      throw new Error(stderr);
    }

    const { latest: version } = JSON.parse(stdout.trim()) || {};
    spinner.succeed(`Latest forge release version: v${version}`);
    return version;
  } catch (err) {
    spinner.fail(`Release version fetch error: ${err.message}`);
    throw err;
  }
}

const fetchAssetsByVersion = async (version, platform) => {
  const versionsInfo = await fetchAsset(ASSETS_PATH.VERSIONS);
  const release = versionsInfo.find(x => semver.eq(version, x.version));

  if (release) {
    return release.assets.filter(x => x.name.indexOf(`_${platform}_`) > 0).map(x => x.name);
  }

  return [];
};

const getLocalAssetsByVersion = (version, platform, releaseDir) => {
  const assetsFolder = path.join(releaseDir, version);
  if (!fs.existsSync(assetsFolder)) {
    throw new Error(`v${version} assets not found in local release directory`);
  }

  const allAssets = fs.readdirSync(assetsFolder);
  return allAssets.filter(fileName => fileName.indexOf(`_${platform}_`) > 0);
};

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
 *
 * @param {array} assets to be downloaded assets
 * @param {object} download meta info
 */
async function downloadAssets(assets, { platform, version, mirror, releaseDir }) {
  const downloadFailedQueue = [];

  // Start download and unzip
  for (const asset of assets) {
    try {
      const assetInfo = getAssetInfo({ platform, version, key: asset, mirror, releaseDir });
      // eslint-disable-next-line no-await-in-loop
      const assetTarball = await downloadAsset(assetInfo);
      // eslint-disable-next-line no-await-in-loop
      await expandReleaseTarball(assetTarball, asset, version);
      fsExtra.removeSync(assetTarball);
    } catch (error) {
      printError(error);
      downloadFailedQueue.push(asset);
    }
  }

  if (downloadFailedQueue.length > 0) {
    print();
    printError('Failed to download:');
    downloadFailedQueue.forEach(x => printInfo(x));
    return false;
  }

  return true;
}

function downloadAsset(assetInfo) {
  return new Promise((resolve, reject) => {
    debug('Download asset', assetInfo.url);

    const assetDest = path.join(os.tmpdir(), assetInfo.name);
    if (fs.existsSync(assetDest)) {
      shell.rm(assetDest);
    }

    if (fs.existsSync(assetInfo.url)) {
      fsExtra.copySync(assetInfo.url, assetDest);
      printSuccess(`Copied release asset ${assetInfo.url}`);
      return resolve(assetDest);
    }

    printInfo(`Start download ${assetInfo.url}`);

    axios
      .get(assetInfo.url, {
        responseType: 'stream',
        timeout: 5 * 60 * 1000, // 5 minutes
      })
      .then(response => {
        const progress = getProgress({
          title: `${symbols.info} Downloading ${assetInfo.name}`,
          unit: 'MB',
        });

        const totalSize = Number(response.headers['content-length']);
        const bufferArray = [];
        progress.start((totalSize / 1024 / 1024).toFixed(2), 0);

        let downloadedLength = 0;
        response.data.on('data', data => {
          bufferArray.push(data);
          downloadedLength += Buffer.byteLength(data);
          progress.update((downloadedLength / 1024 / 1024).toFixed(2));
        });

        response.data.on('end', () => {
          if (!response.data.complete) {
            return reject(new Error('download incomplete'));
          }

          const buffer = Buffer.concat(bufferArray);
          fs.writeFileSync(assetDest, buffer);
          debug(`${assetInfo.name} download success: ${assetDest}`);
          progress.stop();
          return resolve(assetDest);
        });

        response.data.on('error', err => {
          progress.stop();
          reject(err);
        });
      })
      .catch(reject);
  });
}

async function expandReleaseTarball(filePath, subFolder, version) {
  const targetDir = path.join(REQUIRED_DIRS.release, subFolder, version);

  fsExtra.removeSync(targetDir); // ensure target directory is empty
  fs.mkdirSync(targetDir, { recursive: true });

  tar.x({ file: filePath, C: targetDir, strip: 1, sync: true });
  debug(`Expand release asset ${filePath} to ${targetDir}`);
}

function getAssetInfo({ platform, version, key, mirror, releaseDir }) {
  const name = `${key}_${platform}_amd64.tgz`;

  if (releaseDir) {
    const assetPath = path.join(releaseDir, version, name);
    if (fs.existsSync(assetPath)) {
      printSuccess(`Release asset find ${assetPath}`);
      return { name, url: assetPath };
    }
  }

  const url = URL.resolve(mirror, `forge/${version}/${name}`);

  return { url, name };
}

function getUnDownloadAssets({ downloadVersion, whitelistAssets = [], versionAssets }) {
  const unDownloadAssets = whitelistAssets.filter(
    x => versionAssets.some(a => a.indexOf(x) >= 0) && !isReleaseBinExists(x, downloadVersion)
  );

  return unDownloadAssets;
}

function formatVersion({ version, mirror, releaseDir }) {
  if (!version || version === 'latest') {
    const latestVersion = fetchReleaseVersion({ mirror, releaseDir });

    return { isLatest: true, version: latestVersion };
  }

  const cleanedVersion = semver.clean(version);
  if (!cleanedVersion) {
    return { version, isLatest: false }; // just for consistency
  }

  return { version: cleanedVersion, isLatest: false };
}

const DOWNLOAD_FLAGS = {
  SUCCESS: 0,
  FAILED: 1,
  NOT_FOUND: 2,
  ALREADY_EXISTS: 3,
};

/**
 * @param {*} options
 * @return {DOWNLOAD_FLAGS}
 */
async function download({
  version,
  mirror,
  releaseDir,
  platform,
  whitelistAssets,
  force,
  isLatest,
}) {
  let versionAssets = [];
  if (releaseDir) {
    versionAssets = getLocalAssetsByVersion(version, platform, releaseDir);
  } else {
    versionAssets = await fetchAssetsByVersion(version, platform);
  }

  if (versionAssets.length === 0) {
    printError(
      `Version ${version} is not found, please run ${chalk.cyan(
        'forge ls:remote'
      )} to browse available versions.`
    );

    return DOWNLOAD_FLAGS.NOT_FOUND;
  }

  if (isLatest) {
    printInfo(`Download latest version: v${version}.`);
  }

  if (force === true) {
    clearLocalAssets(getReleaseAssets(), version);
  }

  const unDownloadAssets = getUnDownloadAssets({
    whitelistAssets,
    downloadVersion: version,
    versionAssets,
  });

  if (unDownloadAssets.length === 0) {
    printInfo(`forge v${version} is already installed!`);

    return DOWNLOAD_FLAGS.ALREADY_EXISTS;
  }

  const isSuccess = await downloadAssets(unDownloadAssets, {
    platform,
    version,
    mirror,
    releaseDir,
  });

  return isSuccess ? DOWNLOAD_FLAGS.SUCCESS : DOWNLOAD_FLAGS.FAILED;
}

module.exports = {
  formatVersion,
  download,
  downloadAsset,
  DOWNLOAD_FLAGS,
};
