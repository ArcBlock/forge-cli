/* eslint-disable no-restricted-syntax */
const fs = require('fs');
const chalk = require('chalk');
const emoji = require('node-emoji');
const { getPlatform, print, printError, printInfo } = require('core/util');
const { formatVersion, download, DOWNLOAD_FLAGS } = require('./lib');

const { DEFAULT_MIRROR, RELEASE_ASSETS } = require('../../../constant');

// eslint-disable-next-line consistent-return
async function main({ args: [userVersion], opts: { mirror = DEFAULT_MIRROR, releaseDir, force } }) {
  try {
    const platform = await getPlatform();
    printInfo(`Detected platform is: ${platform}`);
    if (mirror && mirror !== DEFAULT_MIRROR) {
      printInfo(`${chalk.yellow(`Using custom mirror: ${mirror}`)}.`);
    }
    if (releaseDir && fs.existsSync(releaseDir)) {
      printInfo(`${chalk.yellow(`Using local releaseDir: ${releaseDir}.`)}`);
    }

    const { version, isLatest } = formatVersion({ version: userVersion, mirror, releaseDir });
    const downloadResult = await download({
      version,
      mirror,
      releaseDir,
      platform,
      whitelistAssets: RELEASE_ASSETS,
      force,
      isLatest,
    });

    if (downloadResult !== DOWNLOAD_FLAGS.SUCCESS) {
      process.exit(1);
    }

    print();
    print(`${emoji.get('tada')} Congratulations! forge v${version} download successfully!`);
    printInfo(
      `Now you can use this version with ${chalk.cyan(
        `forge use ${version}`
      )}: requires reset chain state`
    );
    printInfo(
      `Or you can upgrade to this version with ${chalk.cyan(
        'forge upgrade'
      )}: does not require reset chain state`
    );
    print();
  } catch (err) {
    printError(err);
    printError('Forge release download failed, please try again later');
  }
}

exports.run = main;
exports.execute = main;
