/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
const chalk = require('chalk');
const emoji = require('node-emoji');
const fs = require('fs');
const { applyForgeVersion } = require('core/libs/common');
const { getPlatform, print, printError, printInfo } = require('core/util');
const { isForgeStarted } = require('core/forge-process');
const {
  createAsset,
  formatVersion,
  download,
  DOWNLOAD_FLAGS,
} = require('../../release/download/libs/index');

const { DEFAULT_MIRROR, RELEASE_ASSETS } = require('../../../constant');

async function main({
  args: [userVersion],
  opts: { mirror = DEFAULT_MIRROR, allowMultiChain, releaseDir, force = false },
}) {
  try {
    const platform = await getPlatform();
    if (!userVersion) {
      printInfo(`By default, we'll install the latest version for you.`); // eslint-disable-line
      printInfo(
        `If you want to install a specific version, add the version number in your command like ${chalk.cyan(
          'forge install 0.40.0'
        )}`
      );
      print();
    }

    printInfo(`Detected platform is: ${platform}`);

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

    const { version, isLatest } = await formatVersion(userVersion);
    const asset = createAsset({
      version,
      mirror: releaseDir || mirror,
      platform,
    });

    const downloadResult = await download(asset, {
      whitelistAssets: RELEASE_ASSETS,
      force,
      isLatest,
    });

    if (downloadResult === DOWNLOAD_FLAGS.ALREADY_EXISTS) {
      applyForgeVersion(version);
      process.exit(0);
    }

    if (downloadResult !== DOWNLOAD_FLAGS.SUCCESS) {
      process.exit(1);
    }

    applyForgeVersion(version);
    print();
    print(
      `${emoji.get('tada')} You're all set up! Now run ${chalk.cyan(
        'forge chain:create'
      )} to setup your blockchain.`
    );
  } catch (err) {
    printError(err);
    printError('Forge initialize failed, please try again later');
  }
}

exports.run = main;
exports.execute = main;
