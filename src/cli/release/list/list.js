const chalk = require('chalk');
const semver = require('semver');
const { print, printInfo, printError, highlightOfList } = require('core/util');
const debug = require('core/debug')('list');
const { getGlobalForgeVersion, listReleases } = require('core/forge-fs');

async function main() {
  try {
    const globalVersion = getGlobalForgeVersion();
    debug('global version:', globalVersion);

    const releases = (await listReleases()) || [];
    if (releases.length === 0) {
      printInfo(`Forge release not found, please run ${chalk.cyan('forge install')} first`);
    } else {
      print('Installed:');
      releases.forEach(({ version }) => {
        highlightOfList(
          () =>
            semver.valid(version) &&
            semver.valid(globalVersion) &&
            semver.eq(version, globalVersion),
          version
        );
      });
    }
  } catch (err) {
    printError(err);
    printError(
      `Cannot list installed forge releases, ensure you have run ${chalk.cyan(
        'forge download'
      )} first`
    );

    process.exit(1);
  }
}

exports.run = main;
exports.execute = main;
