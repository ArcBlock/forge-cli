/* eslint-disable no-restricted-syntax */
const shell = require('shelljs');
const chalk = require('chalk');
const semver = require('semver');
const { symbols } = require('core/ui');
const { getPlatform, RELEASE_ASSETS } = require('core/env');
const { isForgeBinExists, getGlobalForgeVersion } = require('core/forge-fs');
const debug = require('core/debug')('download');
const {
  fetchAssetInfo,
  downloadAsset,
  expandReleaseTarball,
  fetchReleaseVersion,
} = require('cli/node/install/install');

// eslint-disable-next-line consistent-return
async function main({ args: [userVersion], opts: { mirror } }) {
  try {
    const platform = await getPlatform();
    shell.echo(`${symbols.info} Detected platform is: ${platform}`);

    const userVer =
      userVersion && semver.coerce(userVersion) ? semver.coerce(userVersion).version : '';
    const version = userVer || fetchReleaseVersion(mirror);
    const currentVersion = getGlobalForgeVersion();
    if (isForgeBinExists(currentVersion)) {
      if (version === currentVersion) {
        return process.exit(1);
      }
    }

    if (!userVer) {
      shell.echo(`${symbols.info} Download latest version: v${version}`);
    }

    // Start download and unzip
    for (const asset of RELEASE_ASSETS) {
      const assetInfo = fetchAssetInfo(platform, version, asset, mirror);
      debug(asset, assetInfo);
      // eslint-disable-next-line no-await-in-loop
      const assetTarball = await downloadAsset(assetInfo);
      expandReleaseTarball(assetTarball, asset, version);
    }

    shell.echo(`${symbols.success} Congratulations! forge v${version} download successfully!`);
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
    shell.echo(`${symbols.error} Forge release download failed, please try again later`);
  }
}

exports.run = main;
exports.execute = main;
