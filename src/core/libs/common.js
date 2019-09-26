/**
 * Common functions, different from `core/util`, this module is at higher level than `core/util`
 */
const { getAllChainNames, listReleases, updateReleaseYaml } = require('../forge-fs');

const DEFAULT_CHAIN_NAME_RETURN = { no_chains: 1 };

async function defaultChainNameHandler({ chainName }) {
  if (chainName) {
    return chainName;
  }

  const chainNames = getAllChainNames();
  if (chainNames.length === 0) {
    return DEFAULT_CHAIN_NAME_RETURN.no_chains;
  }

  return chainNames[0][0];
}

async function hasReleases() {
  const releases = (await listReleases()) || [];
  return releases.length > 0;
}

async function applyForgeVersion(version) {
  updateReleaseYaml('forge', version);
  updateReleaseYaml('simulator', version);
}

module.exports = {
  applyForgeVersion,
  defaultChainNameHandler,
  hasReleases,
  DEFAULT_CHAIN_NAME_RETURN,
};
