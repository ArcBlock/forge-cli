/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
const fs = require('fs');
const semver = require('semver');
const URL = require('url');
const { symbols, getProgress } = require('core/ui');
const { api } = require('core/api');
const { fetchAsset, printInfo, promiseRetry } = require('core/util');
const debug = require('core/debug')('install');

const { ASSETS_PATH } = require('../../../../constant');
const BaseAsset = require('./base-asset');

const downloadAsset = ({ uri, fileName, dest }) =>
  new Promise((resolve, reject) => {
    debug('download assets', uri);

    printInfo(`Start download ${uri}`);

    api
      .get(uri, {
        responseType: 'stream',
        timeout: 5 * 60 * 1000, // 5 minutes
      })
      .then(response => {
        const progress = getProgress({
          title: `${symbols.info} Downloading ${fileName}`,
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
          fs.writeFileSync(dest, buffer);
          debug(`Download ${fileName} successfully: ${dest}`);
          progress.stop();
          return resolve(dest);
        });

        response.data.on('error', err => {
          progress.stop();
          reject(err);
        });
      })
      .catch(reject);
  });

class HttpAsset extends BaseAsset {
  constructor(...args) {
    super(...args);
    this.download = promiseRetry(downloadAsset, 3);
  }

  async getAllAssets() {
    const versionsInfo = await fetchAsset(ASSETS_PATH.VERSIONS, this.baseUri);
    const release = versionsInfo.find(x => semver.eq(this.version, x.version));
    if (release) {
      return release.assets.filter(x => x.name.indexOf(`_${this.platform}_`) > 0).map(x => x.name);
    }

    return [];
  }

  getInfo(name) {
    const fileName = this.getFileName(name);
    const uri = URL.resolve(this.baseUri, `forge/${this.version}/${fileName}`);

    return { uri, name: fileName };
  }
}

module.exports = HttpAsset;
module.exports.downloadAsset = downloadAsset;
