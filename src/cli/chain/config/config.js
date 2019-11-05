const fs = require('fs');
const chalk = require('chalk');
const { hr } = require('core/ui');
const { webUrl } = require('core/env');
const { isForgeStarted } = require('core/forge-process');
const GraphQLClient = require('@arcblock/graphql-client');
const toml = require('@iarna/toml');

const { getChainReleaseFilePath, getChainConfig } = require('core/forge-fs');
const { print, printInfo, printSuccess, printWarning } = require('core/util');

const { getCustomConfigs, previewConfigs, writeConfigs } = require('./lib');

async function main({
  args: [action = 'get'],
  opts: { peer, defaults, chainName = process.env.FORGE_CURRENT_CHAIN },
}) {
  if (action === 'get') {
    if (peer) {
      const client = new GraphQLClient(`${webUrl()}/api`);
      // eslint-disable-next-line no-shadow
      const { config } = await client.getConfig({ parsed: true });
      printSuccess('config for peer:');
      print(hr);
      print(config);
    } else {
      const forgeConfigPath = getChainReleaseFilePath(chainName);
      print(hr);
      printInfo(`config file path: ${forgeConfigPath}`);
      print(hr);
      print(fs.readFileSync(forgeConfigPath).toString());
    }

    return;
  }

  if (action === 'set') {
    const isStarted = await isForgeStarted(chainName);
    if (isStarted) {
      printWarning(
        `${chalk.yellow('You are trying to modify the configuration of a running chain node.')}`
      );
      printWarning(
        `${chalk.yellow(
          'Token and chainId configuration cannot be changed once the chain has started.'
        )}`
      );
      printWarning(
        `${chalk.yellow(
          'If you really need to do this, you\'d better start a new chain or stop and reset existing chain.' // prettier-ignore
        )}`
      );

      process.exit(1);
    }

    const originConfigFilePath = getChainReleaseFilePath(chainName);
    const defaultConfig = toml.parse(fs.readFileSync(originConfigFilePath).toString());
    const { version: forgeCoreVersion } = getChainConfig(chainName);
    const customResults = await getCustomConfigs(defaultConfig, forgeCoreVersion, {
      chainName,
      isCreate: false,
      interactive: !defaults,
    });
    previewConfigs(customResults);

    await writeConfigs(getChainReleaseFilePath(chainName), customResults.configs, true);
    printInfo('You need to restart the chain to load the new config!');
  }
}

exports.run = main;
exports.execute = main;
