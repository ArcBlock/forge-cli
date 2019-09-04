const chalk = require('chalk');
const semver = require('semver');
const { fetchAsset, print, printError } = require('core/util');
const { getLocalVersions } = require('core/forge-fs');

const { ASSETS_PATH, SHIFT_WIDTH } = require('../../../constant');

const printList = (list = [], localVersions = []) => {
  const shiftWidth = ' '.repeat(2);
  if (list.length === 0) {
    print(`${SHIFT_WIDTH}-`);
  } else {
    // prettier-ignore
    list.forEach(x =>
      (localVersions.find(localVersion => semver.eq(localVersion, x))
        ? print(chalk.cyan(`->${SHIFT_WIDTH}${x}`))
        : print(`${shiftWidth}${SHIFT_WIDTH}${x}`)));
  }
};

const main = async () => {
  try {
    const versionsInfo = await fetchAsset(ASSETS_PATH.VERSIONS);
    const versions = versionsInfo
      .filter(x => x.status === undefined || x.status === 'normal')
      .map(x => x.version)
      .sort((x, y) => {
        if (semver.gt(x, y)) {
          return 1;
        }
        if (semver.lt(x, y)) {
          return -1;
        }
        return 0;
      });

    const localVersions = getLocalVersions();

    printList(versions, localVersions);
  } catch (error) {
    printError(error);
  }
};

exports.run = main;
