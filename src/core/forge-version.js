const semver = require('semver');

const isForgePatchVersion = version => {
  const tmp = version.split('-');
  return tmp.length > 1 && tmp[1].startsWith('p');
};

const formatVersion = version => {
  const [forgeMajorVersion, forgePatchVersion = ''] = version.split('-');
  const patch = forgePatchVersion.startsWith('p') ? Number(forgePatchVersion.substring(1)) : -1;
  return { version: forgeMajorVersion, patch };
};

const gt = (v1, v2) => {
  const forgeVersion1 = formatVersion(v1);
  const forgeVersion2 = formatVersion(v2);
  if (forgeVersion1.patch > -1 || forgeVersion2.patch > -1) {
    if (semver.eq(forgeVersion1.version, forgeVersion2.version)) {
      return forgeVersion1.patch > forgeVersion2.patch;
    }

    return semver.gt(v1, v2);
  }

  return semver.gt(v1, v2);
};

const gte = (v1, v2) => gt(v1, v2) || semver.eq(v1, v2);

const lt = (v1, v2) => {
  if (semver.eq(v1, v2) || gt(v1, v2)) {
    return false;
  }

  return true;
};

const lte = (v1, v2) => lt(v1, v2) || semver.eq(v1, v2);

module.exports = { gt, gte, lt, lte, isForgePatchVersion };
