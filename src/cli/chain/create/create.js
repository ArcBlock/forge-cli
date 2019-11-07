const chalk = require('chalk');
const fs = require('fs');
const toml = require('@iarna/toml');
const emoji = require('node-emoji');

const { config } = require('core/env');
const { setConfigToChain } = require('core/forge-config');
const { logError, print, printInfo, printError } = require('core/util');
const {
  createNewChain,
  getOriginForgeReleaseFilePath,
  getChainReleaseFilePath,
} = require('core/forge-fs');
const { hr } = require('core/ui');
const { hasChains } = require('core/libs/common');
const globalConfig = require('core/libs/global-config');

const { DOCUMENT_URL } = require('../../../constant');
const { previewConfigs, readNecessaryConfigs, writeConfigs } = require('../config/lib');

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

    const { configs: customConfigs, chainId, generatedModeratorSK } = await readNecessaryConfigs({
      defaultConfigs,
      chainName,
      silent: defaults === true,
    });

    const configs = await setConfigToChain(customConfigs, chainId, forgeCoreVersion);
    previewConfigs({ configs, generatedModeratorSK });

    if (generatedModeratorSK !== undefined) {
      try {
        globalConfig.setConfig('moderatorSecretKey', generatedModeratorSK);
        print('======================================================');
        print(
          chalk.yellow(
            'Your administrator secret key has been generated and saved in ~/.forgerc.yml. Please preserve it well.'
          )
        );
      } catch (error) {
        printError(
          chalk.red(
            `Save generated administrator secret key ${generatedModeratorSK} to ~/.forgerc.yml failed, please preserve it properly.` // eslint-disable-line
          )
        );
        logError(error);
      }
    }

    createNewChain(chainId);
    await writeConfigs(getChainReleaseFilePath(chainId), configs);
    print(hr);
    print(
      `${emoji.get('tada')} Your blockchain has been created! Now run ${chalk.cyan(
        `forge start ${chainId}`
      )} to run your chain.`
    );
    printInfo(
      ` To modify more about your chain, like block time, token supplies, check ${chalk.cyan(
        DOCUMENT_URL
      )} and follow the instructions.` // eslint-disable-line
    );
  } catch (error) {
    printError('Create new chain failed:');
    printError(error);
  }
}

exports.run = main;
exports.execute = main;
