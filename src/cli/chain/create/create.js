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
const { getCustomConfigs, writeConfigs } = require('../../node/config/lib');

async function main({ args: [chainName = ''], opts: { defaults, allowMultiChain = false } }) {
  if (allowMultiChain === false) {
    printError('Forge CLI is configured to work with single chain only, abort!');
    process.exit(0);
  }
  try {
    const forgeCoreVersion = config.get('cli').globalVersion;
    let configs = toml.parse(
      fs.readFileSync(getOriginForgeReleaseFilePath(forgeCoreVersion)).toString()
    );

    configs = await getCustomConfigs(configs, forgeCoreVersion, {
      chainName,
      interactive: !defaults,
      isCreate: true,
    });

    const {
      app: { name },
    } = configs;
    configs = await setConfigToChain(configs, name, forgeCoreVersion);
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
