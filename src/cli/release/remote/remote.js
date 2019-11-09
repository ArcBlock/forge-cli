const semver = require('semver');
const { fetchAsset, print, printError, printWarning, highlightOfList } = require('core/util');
const { getLocalVersions } = require('core/forge-fs');
const forgeVersion = require('core/forge-version');

const { ASSETS_PATH } = require('../../../constant');

const printList = (list = [], localVersions = []) => {
  if (list.length === 0) {
    printWarning('Forge releases not found.');
  } else {
    print('Forge releases:');
    list.forEach(x =>
      highlightOfList(() => localVersions.find(localVersion => semver.eq(localVersion, x)), x)); // prettier-ignore
  }
};

const main = async () => {
  try {
    const versionsInfo = await fetchAsset(ASSETS_PATH.VERSIONS);
    const versions = versionsInfo
      .filter(x => x.status === undefined || x.status === 'normal')
      .map(x => x.version)
      .sort((x, y) => {
        if (forgeVersion.gt(x, y)) {
          return 1;
        }
        if (forgeVersion.lt(x, y)) {
          return -1;
        }
        return 0;
      });

    const localVersions = await getLocalVersions();

    printList(versions, localVersions);
  } catch (error) {
    printError(error);
  }
};

exports.run = main;
