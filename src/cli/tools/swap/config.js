const chalk = require('chalk');
const fuzzy = require('fuzzy');
const get = require('lodash/get');
const internalIP = require('internal-ip');
const inquirer = require('inquirer');
const { print, printError, printInfo, printSuccess, trim } = require('core/util');
const { formatWallet } = require('core/moderator');
const fs = require('fs');
const TOML = require('@iarna/toml');

const { fromSecretKey } = require('@arcblock/forge-wallet');
const { fromBase64 } = require('@arcblock/forge-util');

const { getForgeSwapConfigFile } = require('core/forge-fs');
const debug = require('core/debug')('swap:config');

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

async function inquire(originalConfig) {
  const internalIPV4 = await internalIP.v4();

  const questions = [
    {
      type: 'text',
      name: 'appName',
      message: 'Please write concise application name:',
      default: get(originalConfig, 'application.name', ''),
      validate: input => {
        if (!input || input.length < 4) {
          return 'Application name should be more than 4 characters long';
        }

        return true;
      },
    },
    {
      type: 'text',
      name: 'appDesc',
      default: get(originalConfig, 'application.description', ''),
      message: 'Please write concise application description:',
      validate: input => {
        if (!input || input.length < 10) {
          return 'Description should be more than 10 characters long';
        }

        return true;
      },
    },
    {
      type: 'text',
      name: 'appSK',
      default: get(originalConfig, 'application.sk', ''),
      message: 'Please input app secret key:',
      validate: input => {
        if (!input) {
          return 'Secret key should not be empty';
        }

        return true;
      },
    },
    {
      type: 'confirm',
      name: 'appSkAsAssetOwnerSK',
      default: true,
      message: 'Use app secret key as asset owner secret key?',
    },
    {
      type: 'text',
      name: 'assetOwnerSK',
      default: get(originalConfig, 'asset_owners.default.sk', ''),
      message: 'Please input asset owner SK:',
      when: d => !d.appSkAsAssetOwnerSK,
      validate: input => {
        if (!input) {
          return 'Asset owner SK should not be empty';
        }

        return true;
      },
    },
    {
      type: 'text',
      name: 'applicationChainHost',
      message: 'Please input application chain host:',
      default: get(originalConfig, 'chains.application.host', internalIPV4),
      validate: input => {
        if (!input) {
          return 'Application chain host should not be empty';
        }

        return true;
      },
    },
    {
      type: 'text',
      name: 'appChainPort',
      default: get(originalConfig, 'chains.application.port', ''),
      message: 'Please input application chain port:',
    },
    {
      type: 'text',
      name: 'assetChainHost',
      message: 'Please input asset chain host:',
      default: get(originalConfig, 'chains.asset.host', internalIPV4),
      validate: input => {
        if (!input) {
          return 'Asset chain host should not be empty';
        }

        return true;
      },
    },
    {
      type: 'text',
      name: 'assetChainPort',
      message: 'Please input asset chain port:',
      default: get(originalConfig, 'chains.asset.port', ''),
    },
    {
      type: 'autocomplete',
      name: 'serviceSchema',
      default: get(originalConfig, 'service.schema') || 'http',
      message: 'Please set swap service schema:',
      source: (_, inp) => {
        const input = inp || '';
        return new Promise(resolve => {
          const result = fuzzy.filter(input, ['http', 'https']);
          resolve(result.map(item => item.original));
        });
      },
    },
    {
      type: 'text',
      name: 'serviceHost',
      default: get(originalConfig, 'service.host') || internalIPV4,
      message: 'Please set swap service host:',
      validate: input => {
        if (!input) {
          return 'Service host should not be empty';
        }

        return true;
      },
    },
    {
      type: 'text',
      name: 'servicePort',
      default: get(originalConfig, 'service.port') || '8807',
      message: 'Please set swap service port:',
      validate: input => {
        if (!input) {
          return 'Service port should not be empty';
        }

        return true;
      },
    },
    {
      type: 'autocomplete',
      name: 'dbType', // For array type parameter
      default: 'postgres',
      message: 'Choose from a list(now only supports postgres):',
      source: (_, inp) => {
        const input = inp || '';
        return new Promise(resolve => {
          const result = fuzzy.filter(input, ['postgres']);
          resolve(result.map(item => item.original));
        });
      },
    },
    {
      type: 'text',
      name: 'dbHostName',
      default: get(originalConfig, 'database.hostname') || 'localhost',
      message: 'Please input db hostname:',
      validate: input => {
        if (!input && !input.trim()) {
          return 'hostname should not be empty';
        }

        return true;
      },
    },
    {
      type: 'text',
      name: 'dbUserName',
      message: 'Please input db username:',
      default: get(originalConfig, 'database.username') || 'postgres',
      validate: input => {
        if (!input) {
          return 'Username should not be empty';
        }

        return true;
      },
    },
    {
      type: 'password',
      name: 'dbPassword',
      message: 'Please input db pasword:',
      validate: input => {
        if (!input) {
          return 'Password should not be empty';
        }

        return true;
      },
    },
    {
      type: 'text',
      name: 'dbName',
      default: get(originalConfig, 'database.database') || 'forge_swap',
      message: 'Please input db name:',
      validate: input => {
        if (!input) {
          return 'Password should not be empty';
        }

        return true;
      },
    },
  ];

  const answers = await inquirer.prompt(questions);

  const appSK = trim(answers.appSK);
  const { pk: appPK, address: appAddress } = formatWallet(fromSecretKey(fromBase64(appSK)));

  let assetOwnerSK = trim(answers.assetOwnerSK);
  if (answers.appSkAsAssetOwnerSK) {
    assetOwnerSK = appSK;
  }

  const { pk: assetOwnerPK, address: assetOwnerAddress } = formatWallet(
    fromSecretKey(fromBase64(assetOwnerSK))
  );

  const configs = {
    application: {
      name: trim(answers.appName),
      description: trim(answers.appDesc),
      did: appAddress,
      sk: appSK,
      pk: appPK,
    },
    service: {
      schema: trim(answers.serviceSchema),
      host: trim(answers.serviceHost),
      port: trim(answers.servicePort),
    },
    database: {
      type: trim(answers.dbType),
      hostname: trim(answers.dbHostName),
      username: trim(answers.dbUserName),
      password: trim(answers.dbPassword),
      database: trim(answers.dbName),
    },
    asset_owners: {
      default: {
        address: assetOwnerAddress,
        pk: assetOwnerPK,
        sk: assetOwnerSK,
      },
    },
    chains: {
      asset: {
        host: trim(answers.assetChainHost),
        port: trim(answers.assetChainPort),
      },
      application: {
        host: trim(answers.applicationChainHost),
        port: trim(answers.appChainPort),
      },
    },
  };

  const swapConfigFile = getForgeSwapConfigFile();
  fs.writeFileSync(swapConfigFile, TOML.stringify(Object.assign({}, originalConfig, configs)));
}

// Run the cli interactively
async function configSwap() {
  let swapConfig = {};
  const swapConfigFile = getForgeSwapConfigFile();
  if (fs.existsSync(swapConfigFile)) {
    swapConfig = TOML.parse(fs.readFileSync(swapConfigFile));
  }

  print('Press ^C to quit.');
  try {
    await inquire(swapConfig);
    print();
    printSuccess(`Configs has been wrote in: ${chalk.cyan(swapConfigFile)}`);
    printSuccess('Forge swap config updated!');
    printInfo('You need to restart forge swap to make the configs take effect.');
  } catch (error) {
    debug(error);
    printError(new Error(`config forge swap failed: ${error.message}`));
    process.exit(1);
  }
}

const readForgeSwapConfig = async swapConfigPath => {
  let swapConfig = {};
  try {
    swapConfig = TOML.parse(fs.readFileSync(swapConfigPath));
  } catch (error) {
    throw new Error(
      'Read forge swap config failed, please check it if it is a valid toml file, config file:',
      swapConfigPath
    );
  }

  return swapConfig;
};

module.exports = { configSwap, readForgeSwapConfig };