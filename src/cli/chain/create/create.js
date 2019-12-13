const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const toml = require('@iarna/toml');
const emoji = require('node-emoji');

const { config } = require('core/env');
const { setConfigToChain } = require('core/forge-config');
const { logError, print, printInfo, printError } = require('core/util');
const {
  isFile,
  createNewChain,
  getOriginForgeConfigPath,
  getOriginForgeWebConfigPath,
  getChainReleaseFilePath,
  getChainWebConfigPath,
} = require('core/forge-fs');
const { hr } = require('core/ui');
const { getChainDirectory } = require('core/forge-fs');
const { hasChains } = require('core/libs/common');
const globalConfig = require('core/libs/global-config');

const { DOCUMENT_URL } = require('../../../constant');
const { readNecessaryConfigs, writeConfigs } = require('../config/lib');

async function main({ args: [chainName = ''], opts: { defaults, allowMultiChain = false } }) {
  if ((await hasChains()) && allowMultiChain === false) {
    printError('Forge CLI is configured to work with single chain only, abort!');
    process.exit(0);
  }

  try {
    const forgeCoreVersion = config.get('cli').globalVersion;
    const defaultConfigs = toml.parse(
      fs.readFileSync(getOriginForgeConfigPath(forgeCoreVersion)).toString()
    );

    const { configs: customConfigs, chainId, generatedModeratorSK } = await readNecessaryConfigs({
      defaultConfigs,
      chainName,
      silent: defaults === true,
    });

    const configs = await setConfigToChain(customConfigs, chainId, forgeCoreVersion);

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
    const chainReleaseFilePath = getChainReleaseFilePath(chainId);
    await writeConfigs(chainReleaseFilePath, configs);
    print(hr);

    // Copy forge web config
    const defaultWebConfigPath = getOriginForgeWebConfigPath(forgeCoreVersion);
    if (isFile(defaultWebConfigPath)) {
      const chainWebConfigPath = getChainWebConfigPath(chainId);
      fs.copyFileSync(defaultWebConfigPath, chainWebConfigPath);
    }

    print(
      `${emoji.get('tada')} Congratulations! Your new blockchain has been saved in ${chalk.cyan(
        getChainDirectory(chainId)
      )}${os.EOL}`
    );
    printInfo(
      ` Configuration for chain ${chalk.cyan(chainId)} is in ${chalk.cyan(chainReleaseFilePath)}`
    );
    printInfo(
      // eslint-disable-next-line
      ` To do further customizations over your chain, like block and asset size, token supply details, check-in bonus setting, etc, please follow instructions in ${chalk.cyan(
        DOCUMENT_URL
      )}`
    );
    printInfo(` Now run ${chalk.cyan(`forge start ${chainId}`)} to run your chain.`);
  } catch (error) {
    printError('Create new chain failed:');
    printError(error);
  }
}

exports.run = main;
exports.execute = main;
