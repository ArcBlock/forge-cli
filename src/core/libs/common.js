/**
 * Common functions, different from `core/util`, this module is at higher level than `core/util`
 */
const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');
const semver = require('semver');
const shell = require('shelljs');
const updateNotifier = require('update-notifier');
const url = require('url');

const api = require('../api');
const debug = require('../debug')('core:libs:common');
const { symbols } = require('../ui');
const {
  UPDATE_CHECK_INTERVAL,
  DEFAULT_CHAIN_NAME_RETURN,
  REQUIRED_DIRS,
} = require('../../constant');
const pkg = require('../../../package.json');
const {
  getAllChainNames,
  getLocalReleases,
  getReleaseBinPath,
  updateReleaseYaml,
} = require('../forge-fs');

const { name: packageName, version: localVersion, engines } = pkg;

async function getDefaultChainNameHandlerByChains({ chainName } = {}) {
  if (chainName) {
    return chainName;
  }

  const name = getTopChainName();
  if (!name) {
    return DEFAULT_CHAIN_NAME_RETURN.NO_CHAINS;
  }

  return name;
}

async function hasReleases() {
  const releasesMap = (await getLocalReleases()) || {};
  return Object.keys(releasesMap).length > 0;
}

async function hasChains() {
  const chains = getAllChainNames() || [];
  return chains.length > 0;
}

/**
 * Get top chain name of local chains
 */
function getTopChainName() {
  const chains = getAllChainNames() || [];
  return chains.length > 0 ? chains[0][0] : '';
}

async function applyForgeVersion(version) {
  updateReleaseYaml('forge', version);
  updateReleaseYaml('simulator', version);
}

function getMinSupportForgeVersion() {
  if (engines && engines.forge && semver.valid(semver.coerce(engines.forge))) {
    return semver.minVersion(engines.forge);
  }

  throw new Error(`invlaid forge engine version: ${engines}`);
}

function getChainVersion(chainName) {
  const allChainNames = getAllChainNames();
  const chain = allChainNames.find(([name]) => name === chainName);

  return chain ? chain[1].version : '';
}

function getOSUserInfo() {
  const { shell: envShell, homedir } = os.userInfo();
  return { shell: process.env.SHELL || envShell, homedir: process.env.HOME || homedir };
}

/**
 * fetch package json information from registry
 * @param {*} registry
 * @param {*} name package name
 */
async function fetchPackageJSON(registry = 'https://registry.npmjs.org/', name, options) {
  const registryUrl = url.resolve(registry, `${encodeURIComponent(name)}/latest`);
  debug('registry url:', registryUrl);

  // details: https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md#getpackageversion
  const resp = await api.create(options).get(registryUrl);

  return resp.data;
}

async function fetchLatestCLIVersion(registry, name, options) {
  const packageJSON = await fetchPackageJSON(registry, name, options);
  return packageJSON.version;
}

function checkUpdate() {
  debug('check update');
  const notifier = updateNotifier({
    pkg: { name: packageName, version: localVersion },
    updateCheckInterval: UPDATE_CHECK_INTERVAL,
  });
  if (notifier && notifier.update) {
    notifier.notify({
      message:
        // eslint-disable-next-line
        'New version available! ' +
        chalk.dim(notifier.update.current) +
        chalk.reset(' → ') +
        chalk.green(notifier.update.latest) +
        ' \nRun ' +
        chalk.cyan(`npm instal -g ${packageName}`) +
        ' to update',
    });
  }
}

function readCache(key) {
  try {
    const filePath = path.join(REQUIRED_DIRS.cache, `${key}.json`);
    return JSON.parse(fs.readFileSync(filePath));
  } catch (err) {
    debug(`cache ${key} read failed!`);
    return null;
  }
}

function writeCache(key, data) {
  try {
    fs.writeFileSync(path.join(REQUIRED_DIRS.cache, `${key}.json`), JSON.stringify(data));
    debug(`${symbols.success} cache ${key} write success!`);
    return true;
  } catch (err) {
    debug.error(`${symbols.error} cache ${key} write failed!`, err);
    return false;
  }
}

const makeForgeSwapRunCommand = (version, { swapConfigPath, subcommand } = {}) => {
  const binPath = getReleaseBinPath('forge_swap', version);
  return makeNativeCommand({
    binPath,
    env: swapConfigPath ? `FORGE_SWAP_CONFIG=${swapConfigPath}` : undefined,
    subcommand,
  });
};
const makeNativeCommandRunner = (command, options = {}) => () => {
  debug('makeNativeCommandRunner command', command);
  const res = shell.exec(command, Object.assign({ silent: false }, options));
  return res;
};

const makeNativeCommand = ({ binPath, subcommand = 'daemon', env = '' }) => {
  if (!fs.existsSync(binPath)) {
    throw new Error(`Bin path ${binPath} does not exist`);
  }

  let command = binPath;
  if (env) {
    debug('env:', env);
    command = `${env} ${command}`;
  }

  const { shell: envShell, homedir } = getOSUserInfo();
  command = `SHELL=${envShell} HOME=${homedir} ${command} ${subcommand}`;

  debug('command:', command);
  return command;
};

const getChainGraphQLHost = config =>
  process.env.FORGE_GQL_ENDPOINT || `http://127.0.0.1:${config.get('forge.web.port', 8210)}/api`;

const checkSatisfiedForgeVersion = (version, range) =>
  semver.satisfies(version, range, { includePrerelease: true });

module.exports = {
  DEFAULT_CHAIN_NAME_RETURN,
  applyForgeVersion,
  cache: {
    write: writeCache,
    read: readCache,
  },
  checkSatisfiedForgeVersion,
  checkUpdate,
  fetchPackageJSON,
  fetchLatestCLIVersion,
  getChainGraphQLHost,
  getChainVersion,
  getDefaultChainNameHandlerByChains,
  getMinSupportForgeVersion,
  getOSUserInfo,
  getTopChainName,
  hasChains,
  hasReleases,
  makeNativeCommand,
  makeForgeSwapRunCommand,
  makeNativeCommandRunner,
};
