const pickBy = require('lodash/pickBy');
const registryUrl = require('registry-url');
const rcfile = require('rcfile');

function getDefaultGlobalConfig() {
  return Object.assign({
    allowMultiChain: true,
    autoUpgrade: true,
    defaults: false,
    mirror: undefined,
    moderatorSecretKey: undefined,
    npmRegistry: registryUrl(),
  });
}

function getConfig(globalConfig = {}, defaultGlobalConfigs = {}) {
  const globalOpts = Object.assign(
    pickBy(defaultGlobalConfigs, v => v !== undefined),
    pickBy(globalConfig, (v, k) => k !== undefined && Object.keys(defaultGlobalConfigs).includes(k)) // only read supported fields
  );

  return globalOpts;
}

function getGlobalConfig() {
  return getConfig(rcfile('forge'), getDefaultGlobalConfig());
}

module.exports = { getGlobalConfig };
