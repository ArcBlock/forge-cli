const chalk = require('chalk');
const semver = require('semver');

const { isForgeStarted } = require('core/forge-process');
const { updateReleaseYaml, getGlobalForgeVersion } = require('core/forge-fs');
const { checkSatisfiedForgeVersion, listReleases } = require('core/libs/common');
const { printError, printSuccess, printWarning } = require('core/util');

const { version: cliVersion, engines } = require('../../../../package.json');

// eslint-disable-next-line consistent-return
async function main({ args: [userVersion], opts: { allowMultiChain = false } }) {
  try {
    if (!semver.valid(userVersion)) {
      printError(
        `Please input a valid version, run ${chalk.cyan('forge ls')} to check the local versions.`
      );
      process.exit(1);
    }

    if (!checkSatisfiedForgeVersion(userVersion, engines.forge)) {
      printError(
        `forge-cli@${cliVersion} requires forge@${engines.forge} to work, but got ${userVersion}!`
      );
      process.exit(1);
    }

    const version = semver.clean(userVersion);
    const globalVersion = getGlobalForgeVersion();
    if (semver.valid(globalVersion) && semver.eq(version, globalVersion)) {
      printWarning(`Already using forge release v${version}`);
      return process.exit(0);
    }

    if (allowMultiChain === false) {
      if (await isForgeStarted()) {
        printWarning('Please stop forge before activate another version');
        return process.exit(1);
      }
    }

    const releases = await listReleases();
    if (!releases.find(item => semver.eq(version, item.version))) {
      printError(
        `forge release v${version} not downloaded, please download it with ${chalk.cyan(
          `forge download ${version}`
        )}`
      );
      return process.exit(1);
    }

    updateReleaseYaml('forge', version);

    printSuccess(`Forge v${version} activated successfully!`);
  } catch (err) {
    printError(err);
    printError('Forge release activate failed');
  }
}

exports.run = main;
exports.execute = main;
