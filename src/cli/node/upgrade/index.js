// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { getTopRunningChains } = require('core/forge-process');
const { execute, run } = require('./upgrade');

cli(
  'upgrade [<chainName>]',
  'Upgrade chain node to new version without reset',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: true,
      rpcClient: true,
      wallet: false,
      chainName: getTopRunningChains,
      chainExists: true,
      currentChainRunning: true,
    },
    parseArgs: chainName => ({ chainName }),
    options: [],
  }
);
