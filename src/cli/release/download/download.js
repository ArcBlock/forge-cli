/* eslint-disable no-restricted-syntax */
const fs = require('fs');
const shell = require('shelljs');
const chalk = require('chalk');
const semver = require('semver');
const { getPlatform } = require('core/env');
const { isReleaseBinExists, getGlobalForgeVersion, getReleaseAssets } = require('core/forge-fs');
const { printError, printInfo, printSuccess, fetchAssetsByVersion } = require('core/util');
const debug = require('core/debug')('download');
const {
  downloadAssets,
  fetchReleaseVersion,
  clearLocalAssets,
} = require('cli/node/install/install');

const { DEFAULT_MIRROR, RELEASE_ASSETS } = require('../../../constant');

// eslint-disable-next-line consistent-return
async function main({ args: [userVersion], opts: { mirror = DEFAULT_MIRROR, releaseDir, force } }) {
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

    if (force === true) {
      clearLocalAssets(getReleaseAssets(), version);
    }

    const versionAssets = await fetchAssetsByVersion(version, platform);
    // prettier-ignore
    const unDownloadAssets = RELEASE_ASSETS
      .filter(x => versionAssets.some(a => a.indexOf(x) >= 0))
      .filter(x => !isReleaseBinExists(x, version));
    const currentVersion = getGlobalForgeVersion();
    if (unDownloadAssets.length === 0) {
      if (version === currentVersion) {
        printInfo(`forge v${version} is already downloaded`);
        return process.exit(0);
      }
    }

    if (!userVer) {
      printInfo(`Download latest version: v${version}`);
    }

    const isSuccess = await downloadAssets(unDownloadAssets, {
      platform,
      version,
      mirror,
      releaseDir,
    });

    if (!isSuccess) {
      printError('Please check your assets version or mirror address is correct and try again.');
      process.exit(1);
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
