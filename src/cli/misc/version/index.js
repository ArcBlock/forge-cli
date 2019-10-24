// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { getTopRunningChains } = require('core/forge-process');

const { getDefaultChainNameHandlerByChains } = require('core/libs/common');
const { DEFAULT_CHAIN_NAME_RETURN } = require('../../../constant');
const { execute, run } = require('./version');

cli(
  'version [<chainName>]',
  'Output version for all forge components',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      rpcClient: true,
      wallet: false,
      chainName: async ({ chainName }) => {
        if (chainName) {
          return chainName;
        }

        const topRunningChainName = await getTopRunningChains();
        if (!Object.values(DEFAULT_CHAIN_NAME_RETURN).includes(topRunningChainName)) {
          return topRunningChainName;
        }

        const res = await getDefaultChainNameHandlerByChains();
        return res;
      },
      chainExists: true,
    },
    parseArgs: chainName => ({ chainName }),
  }
);
