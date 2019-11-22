const fs = require('fs');
const fsExtra = require('fs-extra');
const os = require('os');
const path = require('path');
const shell = require('shelljs');
const tar = require('tar');

const debug = require('core/debug')('base-asset');
const { print, printError, printInfo } = require('core/util');

const { REQUIRED_DIRS } = require('../../../../constant');

async function expandReleaseTarball(filePath, subFolder, version) {
  const targetDir = path.join(REQUIRED_DIRS.release, subFolder, version);

  fsExtra.removeSync(targetDir); // ensure target directory is empty
  fs.mkdirSync(targetDir, { recursive: true });

  tar.x({ file: filePath, C: targetDir, strip: 1, sync: true });
  debug(`Expand release asset ${filePath} to ${targetDir}`);
}

class BaseAsset {
  constructor({ mirror, version, platform }) {
    this.mirror = mirror;
    this.version = version;
    this.platform = platform;
  }

  getFileName(name) {
    return `${name}_${this.platform}_amd64.tgz`;
  }

  download() {
    throw new Error('Not Implement');
  }

  fetchLatest() {
    throw new Error('Not Implement');
  }

  /**
   *
   * @param {array} releases to be downloaded releases
   * @param {object} download meta info
   */
  async downloadReleases(releases) {
    const downloadFailedQueue = [];

    // Start download and unzip
    for (let i = 0; i < releases.length; i++) {
      const releaseName = releases[i];
      try {
        const releaseInfo = this.getInfo(releaseName);
        const assetDest = path.join(os.tmpdir(), releaseInfo.name);
        if (fs.existsSync(assetDest)) {
          shell.rm(assetDest);
        }

        // eslint-disable-next-line no-await-in-loop
        const assetTarball = await this.download({
          uri: releaseInfo.uri,
          fileName: releaseInfo.name,
          dest: assetDest,
        });
        // eslint-disable-next-line no-await-in-loop
        await expandReleaseTarball(assetTarball, releaseName, this.version);
        fsExtra.removeSync(assetTarball);
      } catch (error) {
        printError(error);
        downloadFailedQueue.push(releaseName);
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
}

module.exports = BaseAsset;
