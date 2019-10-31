const chalk = require('chalk');
const fs = require('fs');
const toml = require('@iarna/toml');
const { config } = require('core/env');
const { setConfigToChain } = require('core/forge-config');
const { printInfo, printError } = require('core/util');
const {
  createNewChain,
  getOriginForgeReleaseFilePath,
  getChainReleaseFilePath,
} = require('core/forge-fs');
const { hasChains } = require('core/libs/common');
const { getCustomConfigs, previewConfigs, writeConfigs } = require('../config/lib');

async function main({ args: [chainName = ''], opts: { defaults, allowMultiChain = false } }) {
  if ((await hasChains()) && allowMultiChain === false) {
    printError('Forge CLI is configured to work with single chain only, abort!');
    process.exit(0);
  }

  try {
    const forgeCoreVersion = config.get('cli').globalVersion;
    const defaultConfigs = toml.parse(
      fs.readFileSync(getOriginForgeReleaseFilePath(forgeCoreVersion)).toString()
    );

    const {
      configs: customConfigs,
      generatedModeratorSK,
      generatedTokenHolder,
    } = await getCustomConfigs(defaultConfigs, forgeCoreVersion, {
      chainName,
      interactive: !defaults,
      isCreate: true,
    });

    const {
      tendermint: { moniker: name },
    } = customConfigs;
    const configs = await setConfigToChain(customConfigs, name, forgeCoreVersion);
    previewConfigs({ configs, generatedModeratorSK, generatedTokenHolder });
    createNewChain(name);
    await writeConfigs(getChainReleaseFilePath(name), configs);
    printInfo(`Run ${chalk.cyan(`forge start ${name}`)} to start the chain`);
  } catch (error) {
    printError('Create new chain failed:');
    printError(error);
  }
}

exports.run = main;
exports.execute = main;
