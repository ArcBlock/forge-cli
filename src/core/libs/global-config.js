const fs = require('fs');
const os = require('os');
const pickBy = require('lodash/pickBy');
const registryUrl = require('registry-url');
const rcfile = require('rcfile');
const yaml = require('yaml');

const { getGlobalConfigFilePath } = require('core/forge-fs');
const debug = require('core/debug')('global-config');

const DEFAULT_CONFIGS = {
  allowMultiChain: {
    type: Boolean,
    defaultValue: true,
  },
  autoUpgrade: {
    type: Boolean,
    defaultValue: true,
  },
  configPath: { type: String, defaultValue: undefined },
  defaults: { type: Boolean, defaultValue: false },
  mirror: { type: String, defaultValue: undefined },
  moderatorSecretKey: { type: String, defaultValue: undefined },
  releaseDir: { type: String, defaultValue: undefined },
  npmRegistry: { type: String, defaultValue: registryUrl() },
};

const CONFIG_ITEMS = Object.keys(DEFAULT_CONFIGS);

function getDefaultGlobalConfig() {
  const configs = {};
  CONFIG_ITEMS.forEach(item => {
    configs[item] = DEFAULT_CONFIGS[item].defaultValue;
  });

  return configs;
}

function mergeConfigs(globalConfig = {}, defaultGlobalConfigs = {}) {
  const globalOpts = Object.assign(
    pickBy(defaultGlobalConfigs, v => v !== undefined),
    pickBy(globalConfig, (v, k) => k !== undefined && Object.keys(defaultGlobalConfigs).includes(k)) // only read supported fields
  );

  return globalOpts;
}

function getConfig(item) {
  const configs = getGlobalConfig();
  return configs[item];
}

function setConfig(item, value) {
  if (!CONFIG_ITEMS.includes(item)) {
    throw new Error('invalid config item');
  }

  if (typeof value === 'undefined') {
    throw new Error('value should not be empty');
  }

  if (DEFAULT_CONFIGS[item].type.name === 'Boolean') {
    value = value === 'true' || value === true; // eslint-disable-line
  }

  const rcConfigs = rcfile('forge', { cwd: os.homedir() });
  rcConfigs[item] = DEFAULT_CONFIGS[item].type(value);
  fs.writeFileSync(getGlobalConfigFilePath(), yaml.stringify(rcConfigs));
  debug(`setConfig:${item} was setted with ${value}`);
}

function getGlobalConfig() {
  return mergeConfigs(rcfile('forge', { cwd: os.homedir() }), getDefaultGlobalConfig());
}

module.exports = { getGlobalConfig, getConfig, setConfig };
