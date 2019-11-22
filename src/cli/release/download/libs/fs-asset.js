/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const { printSuccess } = require('core/util');
const debug = require('core/debug')('install');

const BaseAsset = require('./base-asset');

class FSAsset extends BaseAsset {
  async download({ uri, fileName, dest }) {
    debug('copy assets', uri);

    fsExtra.copySync(uri, dest);
    printSuccess(`Copied ${fileName} to ${dest}`);
    return dest;
  }

  async getAllAssets() {
    const assetsFolder = path.join(this.mirror, this.version);
    if (!fs.existsSync(assetsFolder)) {
      throw new Error(`v${this.version} assets not found in local release directory`);
    }

    const allAssets = fs.readdirSync(assetsFolder);
    return allAssets.filter(fileName => fileName.indexOf(`_${this.platform}_`) > 0);
  }

  getInfo(name) {
    const assetPath = path.join(this.mirror, this.version, this.getFileName(name));
    if (fs.existsSync(assetPath)) {
      printSuccess(`Release asset find ${assetPath}`);
      return { name, uri: assetPath };
    }

    throw new Error(`asset path ${assetPath} does not exist`);
  }
}

module.exports = FSAsset;
