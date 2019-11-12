const chalk = require('chalk');
const semver = require('semver');

const { isForgeStarted } = require('core/forge-process');
const { updateReleaseYaml, listReleases, updateChainConfig } = require('core/forge-fs');
const { checkSatisfiedForgeVersion } = require('core/libs/common');
const { printError, printSuccess } = require('core/util');

const { version: cliVersion, engines } = require('../../../../package.json');

// eslint-disable-next-line consistent-return
async function main({ args: [userVersion], opts: { chainName } }) {
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

    const releases = await listReleases();
    if (!releases.find(item => semver.eq(version, item.version))) {
      printError(
        `forge release v${version} not downloaded, please download it with ${chalk.cyan(
          `forge download ${version}`
        )}`
      );
      return process.exit(1);
    }

    if (chainName) {
      if (await isForgeStarted(chainName)) {
        throw new Error('Can not apply on a running chain');
      }

      updateChainConfig(chainName, { version });
      printSuccess(`Forge v${version} activated on ${chalk.cyan(chainName)} successfully!`);
    } else {
      updateReleaseYaml('forge', version);
      printSuccess(`Forge v${version} activated globally successfully!`);
    }
  } catch (err) {
    printError(err);
    printError('Forge release activate failed');
  }
}

exports.run = main;
exports.execute = main;
