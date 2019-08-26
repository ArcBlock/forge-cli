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
const { askUserConfigs, writeConfigs } = require('../../node/config/lib');

async function main({ args: [chainName = ''], opts: { defaults } }) {
  try {
    let configs = toml.parse(
      fs.readFileSync(getOriginForgeReleaseFilePath(config.get('cli').currentVersion)).toString()
    );
    configs = await askUserConfigs(configs, chainName, { interactive: !defaults, isCreate: true });

    const {
      app: { name },
    } = configs;
    configs = await setConfigToChain(configs, name);
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
