/**
 * Common functions, different from `core/util`, this module is at higher level than `core/util`
 */
const { getAllChainNames, listReleases, updateReleaseYaml } = require('../forge-fs');

const DEFAULT_CHAIN_NAME_RETURN = { NO_CHAINS: 1 };

async function getDefaultChainNameHandlerByChains({ chainName }) {
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
  const releases = (await listReleases()) || [];
  return releases.length > 0;
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

module.exports = {
  applyForgeVersion,
  getDefaultChainNameHandlerByChains,
  getTopChainName,
  hasChains,
  hasReleases,
  DEFAULT_CHAIN_NAME_RETURN,
};
