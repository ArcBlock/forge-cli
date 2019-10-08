/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
const chalk = require('chalk');
const fs = require('fs');
const { applyForgeVersion } = require('core/libs/common');
const { getPlatform, print, printError, printInfo, printSuccess } = require('core/util');
const { isForgeStarted } = require('core/forge-process');
const { formatVersion, download, DOWNLOAD_FLAGS } = require('../../release/download/lib');

const { DEFAULT_MIRROR, RELEASE_ASSETS } = require('../../../constant');

async function main({
  args: [userVersion],
  opts: { mirror = DEFAULT_MIRROR, allowMultiChain, releaseDir, force = false },
}) {
  try {
    const platform = await getPlatform();
    printInfo(`Detected platform is: ${platform}`);
    if (mirror && mirror !== DEFAULT_MIRROR) {
      printInfo(`${chalk.yellow(`Using custom mirror: ${mirror}`)}`);
    }

    if (releaseDir && fs.existsSync(releaseDir)) {
      printInfo(`${chalk.yellow(`Using local releaseDir: ${releaseDir}`)}`);
    }

    // Ensure forge is stopped, because init on an running node may cause some mess
    if (allowMultiChain === false) {
      const isStarted = await isForgeStarted();
      if (isStarted) {
        printError('Forge is running, install will break things!');
        printInfo(`To install a new forge release, please run ${chalk.cyan('forge stop')} first!`);
        return process.exit(1);
      }
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

    if (downloadResult === DOWNLOAD_FLAGS.ALREADY_EXISTS) {
      process.exit(0);
    }

    if (downloadResult !== DOWNLOAD_FLAGS.SUCCESS) {
      process.exit(1);
    }

    applyForgeVersion(version);

    printSuccess(`Congratulations! forge v${version} installed successfully!`);
    print();

    print(`Now you can create a chain using v${version} with ${chalk.cyan('forge chain:create')}`);
    print();
  } catch (err) {
    printError(err);
    printError('Forge initialize failed, please try again later');
  }
}

exports.run = main;
exports.execute = main;
