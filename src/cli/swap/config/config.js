const fuzzy = require('fuzzy');
const get = require('lodash/get');
const internalIP = require('internal-ip');
const inquirer = require('inquirer');
const { print, printError, printSuccess } = require('core/util');
const fs = require('fs');
const TOML = require('@iarna/toml');
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
      name: 'appDid',
      default: get(originalConfig, 'application.did', ''),
      message: 'Please input app DID:',
      validate: input => {
        if (!input || input.length !== 35) {
          return 'DID size must be 35 length';
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
      type: 'text',
      name: 'appPK',
      default: get(originalConfig, 'application.pk', ''),
      message: 'Please input app public key:',
      validate: input => {
        if (!input) {
          return 'Public key should not be empty';
        }

        return true;
      },
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
      transformer: v => v.trim(),
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
    {
      type: 'text',
      name: 'assetOwnerAddress',
      default: get(originalConfig, 'asset_owners.default.address', ''),
      message: 'Please input asset owner address:',
      validate: input => {
        if (!input) {
          return 'Owner address should not be empty';
        }

        return true;
      },
    },
    {
      type: 'text',
      name: 'assetOwnerPK',
      default: get(originalConfig, 'asset_owners.default.pk', ''),
      message: 'Please input asset owner PK:',
      validate: input => {
        if (!input) {
          return 'Asset owner PK should not be empty';
        }

        return true;
      },
    },
    {
      type: 'text',
      name: 'assetOwnerSK',
      default: get(originalConfig, 'asset_owners.default.sk', ''),
      message: 'Please input asset owner SK:',
      validate: input => {
        if (!input) {
          return 'Asset owner SK should not be empty';
        }

        return true;
      },
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
      validate: input => {
        if (!input) {
          return 'Asset chain port should not be empty';
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
      validate: input => {
        if (!input) {
          return 'Application chain port should not be empty';
        }

        return true;
      },
    },
  ];

  const answers = await inquirer.prompt(questions);
  const configs = {
    application: {
      name: answers.appName,
      description: answers.appDesc,
      did: answers.appDid,
      sk: answers.appSK,
      pk: answers.appPK,
    },
    service: {
      schema: answers.serviceSchema,
      host: answers.serviceHost,
      port: answers.servicePort,
    },
    database: {
      type: answers.dbType,
      hostname: answers.dbHostName,
      username: answers.dbUsername,
      password: answers.dbPassword,
      database: answers.dbName,
    },
    asset_owners: {
      default: {
        address: answers.assetOwnerAddress,
        pk: answers.assetOwnerPK,
        sk: answers.assetOwnerSK,
      },
    },
    chains: {
      asset: { host: answers.assetChainHost, port: answers.assetChainPort },
      application: { host: answers.applicationChainHost, port: answers.appChainPort },
    },
  };

  const swapConfigFile = getForgeSwapConfigFile();
  fs.writeFileSync(swapConfigFile, TOML.stringify(Object.assign({}, originalConfig, configs)));
  printSuccess('forge swap config updated!');
}

// Run the cli interactively
async function run() {
  print('Press ^C to quit.');
  let swapConfig = {};
  const swapConfigFile = getForgeSwapConfigFile();
  if (fs.existsSync(swapConfigFile)) {
    try {
      swapConfig = TOML.parse(fs.readFileSync(swapConfigFile));
    } catch (error) {
      debug(error);
      printError(new Error(`parse forge swap config failed, forge swap file: ${swapConfigFile}`));
      process.exit(1);
    }
  }

  await inquire(swapConfig);
}

exports.run = run;
