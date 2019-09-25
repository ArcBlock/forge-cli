const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const chalk = require('chalk');
const semver = require('semver');
const debug = require('core/debug')('list');
const { printInfo, printError, highlightOfList } = require('core/util');
const { listReleases } = require('core/forge-fs');

const { REQUIRED_DIRS } = require('../../../constant');

async function main() {
  let current = '';
  try {
    const { release } = REQUIRED_DIRS;
    if (fs.existsSync(path.join(release, 'forge')) === true) {
      const filePath = path.join(release, 'forge', 'release.yml');
      const yamlObj = fs.existsSync(filePath)
        ? yaml.parse(fs.readFileSync(filePath).toString()) || {}
        : {};
      // eslint-disable-next-line prefer-destructuring
      current = yamlObj.current;
    }
  } catch (err) {
    debug.error(err);
  }

  try {
    const releases = (await listReleases()) || [];
    if (releases.length === 0) {
      printInfo(`Forge release not found, please run ${chalk.cyan('forge install')} first`);
    } else {
      releases.forEach(({ version }) => {
        highlightOfList(() => semver.eq(version, current), version);
      });
    }
  } catch (err) {
    debug(err);
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
