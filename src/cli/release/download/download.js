/* eslint-disable no-restricted-syntax */
const fs = require('fs');
const shell = require('shelljs');
const chalk = require('chalk');
const semver = require('semver');
const { getPlatform, RELEASE_ASSETS, DEFAULT_MIRROR } = require('core/env');
const { isForgeBinExists, getGlobalForgeVersion } = require('core/forge-fs');
const { printError, printInfo, printSuccess } = require('core/util');
const debug = require('core/debug')('download');
const {
  fetchAssetInfo,
  downloadAsset,
  expandReleaseTarball,
  fetchReleaseVersion,
} = require('cli/node/install/install');

// eslint-disable-next-line consistent-return
async function main({ args: [userVersion], opts: { mirror = DEFAULT_MIRROR, releaseDir } }) {
  try {
    const platform = await getPlatform();
    printInfo(`Detected platform is: ${platform}`);
    if (mirror && mirror !== DEFAULT_MIRROR) {
      printInfo(`${chalk.yellow(`Using custom mirror: ${mirror}`)}`);
    }
    if (releaseDir && fs.existsSync(releaseDir)) {
      printInfo(`${chalk.yellow(`Using local releaseDir: ${releaseDir}`)}`);
    }

    const userVer =
      userVersion && semver.coerce(userVersion) ? semver.coerce(userVersion).version : '';
    const version = userVer || fetchReleaseVersion({ mirror, releaseDir });
    const currentVersion = getGlobalForgeVersion();
    if (isForgeBinExists(currentVersion)) {
      if (version === currentVersion) {
        return process.exit(1);
      }
    }

    if (!userVer) {
      printInfo(`Download latest version: v${version}`);
    }

    // Start download and unzip
    for (const asset of RELEASE_ASSETS) {
      const assetInfo = fetchAssetInfo({ platform, version, key: asset, mirror, releaseDir });
      debug(asset, assetInfo);
      // eslint-disable-next-line no-await-in-loop
      const assetTarball = await downloadAsset({ asset: assetInfo });
      expandReleaseTarball(assetTarball, asset, version);
    }

    printSuccess(`Congratulations! forge v${version} download successfully!`);
    shell.echo('');
    shell.echo(
      `Now you can use this version with ${chalk.cyan(
        `forge use ${version}`
      )}: requires reset chain state`
    );
    shell.echo(
      `Or you can upgrade to this version with ${chalk.cyan(
        'forge upgrade'
      )}: does not requires reset chain state`
    );
    shell.echo('');
  } catch (err) {
    debug.error(err);
    printError('Forge release download failed, please try again later');
  }
}

exports.run = main;
exports.execute = main;
