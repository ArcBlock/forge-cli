const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const numeral = require('numeral');
const inquirer = require('inquirer');
const get = require('lodash/get');
const lowerCase = require('lodash/lowerCase');
const cloneDeep = require('lodash/cloneDeep');
const toml = require('@iarna/toml');
const base64 = require('base64-url');
const base64Img = require('base64-img');
const kebabCase = require('lodash/kebabCase');
const semver = require('semver');

const { isValid, isFromPublicKey } = require('@arcblock/did');
const { types } = require('@arcblock/mcrypto');
const { fromRandom, fromSecretKey, WalletType } = require('@arcblock/forge-wallet');
const { hexToBytes, toBase64, fromBase64 } = require('@arcblock/forge-util');

const { ensureConfigComment } = require('core/env');
const { formatWallet, formatSecretKey, getModerator } = require('core/moderator');
const { pretty } = require('core/ui');
const { print, printInfo, printError, printSuccess, printWarning } = require('core/util');
const debug = require('core/debug')('config:lib');
const { getChainDirectory } = require('core/forge-fs');
const { setFilePathOfConfig } = require('core/forge-config');
const { inquire } = require('core/libs/interaction');

const { DEFAULT_ICON_BASE64, REQUIRED_DIRS, RESERVED_CHAIN_NAMES } = require('../../../constant');

const DAYS_OF_YEAR = 365;

const generateWallet = () => {
  const wallet = fromRandom(
    WalletType({
      pk: types.KeyType.ED25519,
      hash: types.HashType.SHA3,
      role: types.RoleType.ROLE_ACCOUNT,
      address: types.EncodingType.BASE58,
    })
  );

  const json = wallet.toJSON();
  json.pk_base64_url = base64.encode(hexToBytes(json.pk));
  json.sk_base64_url = base64.encode(hexToBytes(json.sk));

  return json;
};

function getNumberValidator(label, integer = true) {
  return v => {
    if (!Number(v)) return `The ${label} should be a number`;
    if (Number(v) <= 0) return `The ${label} should be a positive number`;
    if (integer) {
      if (v.toString().indexOf('.') >= 0) return `The ${label} should be a positive integer`;
    }
    return true;
  };
}

function initialSupplyValidator(num, answers) {
  const basicValidation = getNumberValidator('initial supply')(num);
  if (basicValidation !== true) {
    return basicValidation;
  }
  const initialSupply = Number(num);
  const totalSupply = Number(answers.tokenTotalSupply);
  if (initialSupply > totalSupply) {
    return 'Initial supply should less or equal than total supply';
  }

  return true;
}

function pokeAmountValidator(v, answers) {
  const basicValidation = getNumberValidator('poke amount', false)(v);
  if (basicValidation !== true) {
    return basicValidation;
  }

  const pokeAmount = Number(v);
  const tokenInitialSupply = Number(answers.tokenInitialSupply);
  if (pokeAmount * DAYS_OF_YEAR * 4 > tokenInitialSupply) {
    return `Poke amount is too big. Make sure it is less than initial supply / ${DAYS_OF_YEAR} / 4`;
  }

  return true;
}

function dailyLimitValidator(v, answers) {
  const basicValidation = getNumberValidator('daily poke limit', false)(v);
  if (basicValidation !== true) {
    return basicValidation;
  }

  const dailyLimit = Number(v);
  const pokeAmount = Number(answers.pokeAmount);
  if (dailyLimit < pokeAmount) {
    return 'Daily poke limit should greater or equal than poke amount';
  }

  if (dailyLimit * DAYS_OF_YEAR * 4 > Number(answers.tokenInitialSupply)) {
    return `Daily poke limit is too big. Make sure it is less than initial supply / ${DAYS_OF_YEAR} / 4`;
  }

  return true;
}

function pokeBalanceValidator(v, answers) {
  const basicValidation = getNumberValidator('total poke amount', false)(v);
  if (basicValidation !== true) {
    return basicValidation;
  }

  if (Number(v) > Number(answers.initialSupply)) {
    return 'Poke balance is too big. Make sure it is less than initial supply';
  }

  const totalPokeToken = Number(answers.pokeDailyLimit) * 4 * DAYS_OF_YEAR;
  if (Number(v) < totalPokeToken) {
    return `Poke balance is too small. Make sure it is bigger than daily limit * ${DAYS_OF_YEAR} * 4`;
  }

  return true;
}

function isReservedChainName(chainName = '', reservedChainNames = []) {
  return reservedChainNames.includes(chainName);
}

const chainNameValidateFunc = chainName => {
  if (!chainName) {
    return 'The chain name should not be empty';
  }

  if (!/^[a-zA-Z][a-zA-Z0-9-_]{3,23}$/.test(chainName)) {
    return 'The chain name should start with a letter, only contain 0-9,a-z,A-Z, and length between 4~24';
  }

  if (isReservedChainName(chainName, RESERVED_CHAIN_NAMES)) {
    return `${chalk.cyan(chainName)} is reserved, please use another one`;
  }

  if (fs.existsSync(getChainDirectory(chainName))) {
    return `The chain ${chalk.cyan(chainName)} already exists, please use another one.`;
  }

  return true;
};

async function readUserConfigs(configs, chainName = '', { interactive = true } = {}) {
  const defaults = cloneDeep(configs);
  defaults.forge.prime = defaults.forge.prime || {};
  defaults.forge.prime.token_holder = defaults.forge.prime.token_holder || {};

  const tokenDefaults = Object.assign(
    {
      name: 'ArcBlock',
      symbol: 'ABT',
      unit: 'arc',
      description: 'Forge token ABT',
      icon: DEFAULT_ICON_BASE64,
      decimal: 18,
      initial_supply: 7500000000,
      total_supply: 7500000000,
      inflation_rate: 0,
    },
    defaults.forge.token || {}
  );

  const pokeDefaults = Object.assign(
    {
      daily_limit: 2500000,
      amount: 25,
    },
    defaults.forge.transaction.poke || {}
  );

  const tokenHolderDefaults = Object.assign(
    {
      address: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
      balance: 4000000000,
    },
    defaults.forge.prime.token_holder || {}
  );

  // default icon file
  const iconFile = path.join(REQUIRED_DIRS.tmp, 'token.png');
  fsExtra.removeSync(iconFile);
  base64Img.imgSync(tokenDefaults.icon, REQUIRED_DIRS.tmp, 'token');

  // moderator
  let moderator = getModerator();
  debug('moderator', moderator);

  const questions = [];

  printSuccess(`Chain Name: ${chainName}`);

  questions.push(
    ...[
      {
        type: 'number',
        name: 'blockTime',
        message: 'Please input block time (in seconds):',
        default: parseInt(defaults.tendermint.timeout_commit, 10) || 3,
        validate: v => {
          const validateRes = getNumberValidator('block time')(v);
          if (validateRes !== true) {
            return validateRes;
          }

          if (parseInt(v, 10) < 3) {
            return 'The min block time is 3s';
          }

          return true;
        },
      },
      {
        type: 'confirm',
        name: 'customizeToken',
        message: 'Do you want to customize token config for this chain?',
        default: false,
      },
      {
        type: 'text',
        name: 'tokenName',
        message: 'Token Name:', // eslint-disable-line
        default: tokenDefaults.name,
        when: d => d.customizeToken,
        validate: v => {
          if (!v) return 'The token name should not be empty';
          if (!/^[a-zA-Z][a-zA-Z0-9_\-\s]{5,35}$/.test(v)) {
            return 'The token name should start with a letter, only contain 0-9,a-z,A-Z, and length between 6~36';
          }
          return true;
        },
      },
      {
        type: 'text',
        name: 'tokenSymbol',
        message: 'Token Symbol:', // eslint-disable-line
        default: tokenDefaults.symbol,
        when: d => d.customizeToken,
        validate: v => {
          if (!v) return 'The token symbol should not be empty';
          if (!/^[a-zA-Z][a-zA-Z0-9]{2,5}$/.test(v)) {
            return 'The token symbol should start with a letter, only contain 0-9,a-z,A-Z, and length between 3~6';
          }
          return true;
        },
      },
      {
        type: 'text',
        name: 'tokenIcon',
        message: "What's the token icon?", // eslint-disable-line
        default: iconFile,
        when: d => d.customizeToken,
        validate: v => {
          if (!v) return 'The token icon should not be empty';
          if (!fs.existsSync(v)) {
            return 'The token icon should be a valid file path';
          }
          try {
            base64Img.base64Sync(v);
          } catch (err) {
            return 'The token icon should be a valid image file';
          }
          return true;
        },
      },
      {
        type: 'text',
        name: 'tokenDescription',
        message: 'Whats the token description?',
        default: tokenDefaults.description,
        when: d => d.customizeToken,
        validate: v => {
          if (!v) return 'The token description should not be empty';
          if (!/^[a-zA-Z][a-zA-Z0-9_\-\s]{5,255}$/.test(v)) {
            return 'The token description should start with a letter, only contain 0-9,a-z,A-Z, and length between 6~256';
          }
          return true;
        },
      },
      {
        type: 'number',
        name: 'tokenTotalSupply',
        message: 'Please input token total supply:',
        default: tokenDefaults.total_supply,
        when: d => d.customizeToken,
        validate: getNumberValidator('total supply'),
        transformer: v => numeral(v).format('0,0'),
      },
      {
        type: 'number',
        name: 'tokenInitialSupply',
        message: 'Please input token initial supply:',
        default: answers => answers.tokenTotalSupply || tokenDefaults.initial_supply,
        when: d => d.customizeToken,
        validate: initialSupplyValidator,
        transformer: v => numeral(v).format('0,0'),
      },
      {
        type: 'number',
        name: 'tokenDecimal',
        message: 'Please input token decimal:',
        default: tokenDefaults.decimal,
        when: d => d.customizeToken,
        validate: getNumberValidator('token decimal'),
      },
      {
        type: 'confirm',
        name: 'enablePoke',
        message: 'Do you want to enable "feel lucky" (poke) feature for this chain?',
        default:
          typeof defaults.forge.transaction.poke === 'undefined'
            ? true
            : defaults.forge.transaction.poke.amount,
      },
      {
        type: 'confirm',
        name: 'customizePoke',
        message: 'Do you want to customize "feel lucky" (poke) config for this chain?',
        when: d => d.enablePoke,
        default: false,
      },
      {
        type: 'number',
        name: 'pokeAmount',
        message: 'How much token to give on a successful poke?',
        default: defaults.forge.transaction.poke
          ? defaults.forge.transaction.poke.amount
          : pokeDefaults.amount,
        when: d => d.customizePoke,
        validate: pokeAmountValidator,
        transformer: v => numeral(v).format('0,0.0000'),
      },
      {
        type: 'number',
        name: 'pokeDailyLimit',
        message: 'How much token can be poked daily?',
        default: d =>
          Math.min(
            Number(d.pokeAmount) * 10000,
            Math.floor(Number(d.tokenInitialSupply) / (4 * DAYS_OF_YEAR))
          ),
        when: d => d.customizePoke,
        validate: dailyLimitValidator,
        transformer: v => numeral(v).format('0,0'),
      },
      {
        type: 'number',
        name: 'pokeBalance',
        message: 'How much token can be poked in total?',
        default: d =>
          Math.min(
            d.pokeDailyLimit * DAYS_OF_YEAR * 4,
            d.tokenInitialSupply ||
              get(defaults, 'forge.token.initial_supply') ||
              tokenDefaults.initial_supply
          ),
        when: d => d.customizePoke,
        validate: pokeBalanceValidator,
        transformer: v => numeral(v).format('0,0'),
      },
      {
        type: 'list',
        name: 'moderatorInputType',
        message: 'Input moderator secret key, or generate if do not have one?',
        choices: ['Generate', 'Input'],
        when: () => !moderator,
        default: 'Generate',
      },
      {
        type: 'text',
        name: 'userModeratorSK',
        message: 'Input moderator secret key:',
        when: d => d.moderatorInputType === 'Input',
        validate: v => {
          if (!v.trim()) {
            return 'Moderator secret key should not be empty';
          }

          return true;
        },
      },
      {
        type: 'confirm',
        name: 'moderatorAsTokenHolder',
        message: d => {
          const total = d.customizeToken ? d.tokenInitialSupply : tokenDefaults.initial_supply;
          // eslint-disable-next-line no-nested-ternary
          const poked = d.enablePoke
            ? d.customizePoke
              ? d.pokeBalance
              : tokenHolderDefaults.balance
            : 0;
          const symbol = d.customizeToken ? d.tokenSymbol : tokenDefaults.symbol;
          return `Set moderator as token owner of (${total - poked} ${symbol}) on chain start?`;
        },
        default: true,
      },
      {
        type: 'list',
        name: 'accountSourceType',
        message: 'Input token holder address, or generate if do not have one?',
        when: d => d.moderatorAsTokenHolder === false,
        choices: ['Generate', 'Input'],
        default: 'Generate',
      },
      {
        type: 'text',
        name: 'tokenHolderAddress',
        message: 'Please input token holder address',
        validate: v => {
          if (!v.trim()) return 'Token holder address should not be empty';
          if (!isValid(v.trim())) return 'Token holder address must be valid did';
          return true;
        },
        when: d => d.accountSourceType === 'Input',
        default: '',
      },
      {
        type: 'text',
        name: 'tokenHolderPk',
        message: 'Please input token holder public key in base64_url format',
        validate: (v, d) => {
          if (!v.trim()) return 'Token holder public key should not be empty';
          const pkBuffer = Buffer.from(base64.unescape(v), 'base64');
          if (!isFromPublicKey(d.tokenHolderAddress, pkBuffer)) {
            return 'Token holder public key does not match with address';
          }

          return true;
        },
        when: d => d.accountSourceType === 'Input',
        default: '',
      },
    ]
  );

  let answers = {};
  if (interactive) {
    answers = await inquirer.prompt(questions);
  } else {
    answers = questions.reduce((acc, x) => {
      // Conditional defaults
      if (typeof x.when === 'function') {
        if (x.when(acc)) {
          acc[x.name] = x.default;
        }
      } else {
        acc[x.name] = x.default;
      }
      return acc;
    }, {});
  }

  if (answers.accountSourceType === 'Generate') {
    const wallet = generateWallet();
    debug('random token holder', wallet);
    answers.tokenHolderAddress = wallet.address;
    answers.tokenHolderPk = wallet.pk_base64_url;
    answers.tokenHolderSk = wallet.sk_base64_url;
  }

  const {
    name = chainName,
    blockTime,
    customizeToken,
    tokenName,
    tokenSymbol,
    tokenIcon,
    tokenDescription,
    tokenTotalSupply,
    tokenInitialSupply,
    tokenDecimal,
    enablePoke,
    customizePoke,
    pokeBalance,
    pokeDailyLimit,
    pokeAmount,
    moderatorInputType,
    userModeratorSK,
    moderatorAsTokenHolder,
    tokenHolderAddress,
    tokenHolderPk,
  } = answers;

  let generatedModeratorSK;
  if (!moderator) {
    printWarning('Moderator sk was not set in local environment.');
    if (moderatorInputType === 'Generate') {
      const generatedModerator = fromRandom();
      moderator = formatWallet(generatedModerator);
      generatedModeratorSK = base64.escape(base64.encode(hexToBytes(generatedModerator.secretKey)));
    } else {
      moderator = formatWallet(formatSecretKey(userModeratorSK));
    }

    moderator.balance = 0;
  }

  defaults.tendermint.moniker = `${name}-01`;
  defaults.tendermint.timeout_commit = `${blockTime}s`;
  defaults.tendermint.genesis.chain_id = kebabCase(name);

  // token config
  defaults.forge.token = tokenDefaults;
  if (customizeToken) {
    defaults.forge.token.name = tokenName;
    defaults.forge.token.symbol = tokenSymbol;
    defaults.forge.token.icon = base64Img.base64Sync(tokenIcon);
    defaults.forge.token.description = tokenDescription;
    defaults.forge.token.total_supply = Number(tokenTotalSupply);
    defaults.forge.token.initial_supply = Number(tokenInitialSupply);
    defaults.forge.token.token_decimal = Number(tokenDecimal);
  }

  // poke config
  if (enablePoke) {
    defaults.forge.transaction.poke = pokeDefaults;
    if (customizePoke) {
      defaults.forge.prime.token_holder.balance = Number(
        pokeBalance || defaults.forge.prime.token_holder.balance
      );
      defaults.forge.transaction.poke.daily_limit = Number(
        pokeDailyLimit || defaults.forge.transaction.poke.daily_limit
      );
      defaults.forge.transaction.poke.amount = Number(
        pokeAmount || defaults.forge.transaction.poke.amount
      );
    }
  } else {
    defaults.forge.transaction.poke = {};
    defaults.forge.prime.token_holder.balance = 0;
    defaults.forge.transaction.poke.daily_limit = 0;
    defaults.forge.transaction.poke.amount = 0;
  }

  // accounts config
  const total = customizeToken ? tokenInitialSupply : tokenDefaults.initial_supply;
  // eslint-disable-next-line no-nested-ternary
  const poked = enablePoke ? (customizePoke ? pokeBalance : tokenHolderDefaults.balance) : 0;
  if (moderatorAsTokenHolder) {
    defaults.forge.accounts = [
      {
        address: moderator.address,
        pk: moderator.publicKey,
        balance: total - poked,
      },
    ];
  } else {
    defaults.forge.accounts = [
      {
        address: tokenHolderAddress.trim(),
        pk: tokenHolderPk.trim(),
        balance: total - poked,
      },
    ];
  }

  const result = setFilePathOfConfig(defaults, name);
  let generatedTokenHolder;
  if (!moderatorAsTokenHolder && answers.accountSourceType === 'Generate') {
    generatedTokenHolder = {
      address: tokenHolderAddress,
      pk: tokenHolderPk,
      sk: answers.tokenHolderSk,
    };
  }

  return { configs: result, generatedModeratorSK, generatedTokenHolder, chainId: name };
}

const mapToStandard = configs => {
  const result = cloneDeep(configs);
  result.forge.transaction = result.forge.transaction || {};

  result.forge.prime = result.forge.prime || {};
  result.forge.prime.token_holder = result.forge.prime.token_holder
    ? result.forge.prime.token_holder
    : {};

  result.forge.prime.moderator = result.forge.moderator;
  result.forge.transaction.stake = result.forge.stake.timeout;
  result.forge.transaction.stake.timeout_general = result.forge.transaction.stake.general;
  result.forge.transaction.stake.timeout_stake_for_node =
    result.forge.transaction.stake.stake_for_node;

  return result;
};

const mapToLessThanV38 = configs => {
  const result = cloneDeep(configs);
  result.forge.poke = result.forge.transaction.poke || {};

  result.forge.poke.address = result.forge.prime.token_holder.address;
  result.forge.poke.balance = result.forge.prime.token_holder.balance;
  result.forge.moderator = result.forge.prime.moderator;

  const { general, stake_for_node } = result.forge.transaction.stake; // eslint-disable-line
  result.forge.stake.timeout = Object.assign(result.forge.transaction.stake, {
    general,
    stake_for_node,
  });

  if (result.forge.transaction.poke) {
    delete result.forge.transaction.poke;
  }

  if (result.forge.prime) {
    delete result.forge.prime;
  }

  if (result.forge.transaction.stake) {
    delete result.forge.transaction.stake;
  }

  return result;
};

async function getCustomConfigs(
  configs,
  forgeCoreVersion,
  { chainName = '', isCreate = false, interactive = true } = {}
) {
  const configsCopy = cloneDeep(configs);

  if (semver.lt(forgeCoreVersion, '0.38.0')) {
    // for forge core version gte 0.38.0
    const userConfigs = await readUserConfigs(mapToStandard(configsCopy), chainName, {
      isCreate,
      interactive,
    });

    const v38Configs = mapToLessThanV38(userConfigs.configs);
    userConfigs.configs = v38Configs;

    return userConfigs;
  }

  if (semver.gte(forgeCoreVersion, '0.38.0')) {
    return readUserConfigs(configsCopy, chainName, { isCreate, interactive });
  }

  return readUserConfigs(configsCopy, chainName, { isCreate, interactive }); // for always return a value in a function
}

async function writeConfigs(targetPath, configs, overwrite = true) {
  if (fs.existsSync(targetPath) && !overwrite) {
    debug('config file exists');
    return;
  }

  fs.writeFileSync(targetPath, ensureConfigComment(toml.stringify(configs)));
}

const previewConfigs = ({ configs, generatedTokenHolder }) => {
  print('Config Preview:');
  print(pretty(configs));

  if (generatedTokenHolder) {
    print('\n======================================================');
    printInfo(chalk.yellow('Generated Token Holder Account (Please Keep the secret key safe):'));
    print('======================================================');
    print('Address:', chalk.cyan(generatedTokenHolder.address));
    print('PublicKey:', chalk.cyan(generatedTokenHolder.pk));
    print('SecretKey:', chalk.cyan(generatedTokenHolder.sk));
  }
};

const readNecessaryConfigs = async ({ defaultConfigs, chainName, silent = false }) => {
  const defaultConfigsCopy = cloneDeep(defaultConfigs);

  defaultConfigsCopy.forge.prime = defaultConfigsCopy.forge.prime || {};
  defaultConfigsCopy.forge.prime.token_holder = defaultConfigsCopy.forge.prime.token_holder || {};
  const tokenHolderDefaults = Object.assign(
    {
      address: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
      balance: 4000000000,
    },
    defaultConfigsCopy.forge.prime.token_holder || {}
  );

  const tokenDefaults = Object.assign(
    {
      name: 'MyToken',
      symbol: 'MYT',
      unit: 'myt',
      icon: DEFAULT_ICON_BASE64,
      decimal: 18,
      initial_supply: 7500000000,
      total_supply: 7500000000,
      inflation_rate: 0,
    },
    defaultConfigsCopy.forge.token || {}
  );

  const basicQuestions = [
    {
      type: 'text',
      name: 'tokenName',
      message: 'Token Name:', // eslint-disable-line
      default: tokenDefaults.name,
      validate: v => {
        if (!v) return 'The token name should not be empty';
        if (!/^[a-zA-Z][a-zA-Z0-9_\-\s]{5,35}$/.test(v)) {
          return 'The token name should start with a letter, only contain 0-9,a-z,A-Z, and length between 6~36';
        }
        return true;
      },
    },
    {
      type: 'text',
      name: 'tokenSymbol',
      message: 'Token Symbol:', // eslint-disable-line
      default: tokenDefaults.symbol,
      validate: v => {
        if (!v) return 'The token symbol should not be empty';
        if (!/^[a-zA-Z][a-zA-Z0-9]{2,5}$/.test(v)) {
          return 'The token symbol should start with a letter, only contain 0-9,a-z,A-Z, and length between 3~6';
        }
        return true;
      },
    },
  ];

  const chainIdQuestion = {
    type: 'text',
    name: 'chainId',
    message: 'Chain Name:',
    default: 'my-chain',
    validate: chainNameValidateFunc,
  };

  if (chainName) {
    const chainNameValidateResult = chainNameValidateFunc(chainName);
    if (chainNameValidateResult === true) {
      printSuccess(`Chain Name: ${chainName}`);
    } else if (silent === true) {
      throw new Error(chainNameValidateResult);
    } else {
      printError(chainNameValidateResult);
      basicQuestions.unshift(chainIdQuestion);
    }
  } else {
    basicQuestions.unshift(chainIdQuestion);
  }

  const basicConfigs = await inquire(basicQuestions, { silent });

  let moderator = getModerator();
  let generatedModeratorSK;
  if (!moderator) {
    const { inputModeratorSK, userModeratorSK } = await inquire(
      [
        {
          type: 'confirm',
          name: 'inputModeratorSK',
          message: 'Do you already have an administrator secret key?',
          default: false,
        },
        {
          type: 'text',
          name: 'userModeratorSK',
          message: 'Input your secret key:',
          when: d => d.inputModeratorSK === true,
          validate: v => {
            if (!v.trim()) {
              return 'Secret key should not be empty';
            }

            return true;
          },
        },
      ],
      { silent }
    );

    if (inputModeratorSK === false) {
      const generatedModerator = fromRandom();
      moderator = formatWallet(generatedModerator);
      generatedModeratorSK = toBase64(generatedModerator.secretKey);
      if (!silent) {
        print(
          chalk.yellow(
            'Your secret key will be generated and saved in ~/.forgerc.yml. Please preserve it well.'
          )
        );
      }
    } else {
      moderator = formatWallet(fromSecretKey(fromBase64(userModeratorSK)));
    }
  }

  const { chainId = chainName, tokenName, tokenSymbol } = basicConfigs;

  defaultConfigsCopy.tendermint.moniker = `${chainId}-01`;
  defaultConfigsCopy.tendermint.timeout_commit = '3s';
  defaultConfigsCopy.tendermint.genesis.chain_id = chainId;
  defaultConfigsCopy.tendermint.genesis.genesis_time = new Date();

  defaultConfigsCopy.forge.token = Object.assign(tokenDefaults, {
    name: tokenName,
    symbol: tokenSymbol,
    unit: lowerCase(tokenSymbol),
    description: `My token ${tokenSymbol}`,
  });

  defaultConfigsCopy.forge.prime.moderator = {
    address: moderator.address,
    pk: moderator.pk,
    balance: 0,
  };

  defaultConfigsCopy.forge.accounts = [
    {
      address: moderator.address,
      pk: moderator.publicKey,
      balance: tokenDefaults.initial_supply - tokenHolderDefaults.balance,
    },
  ];

  defaultConfigsCopy.forge.transaction.poke = Object.assign(
    {
      daily_limit: 2500000,
      amount: 25,
    },
    defaultConfigsCopy.forge.transaction.poke || {}
  );

  return { configs: defaultConfigsCopy, chainId, generatedModeratorSK };
};

module.exports = { getCustomConfigs, previewConfigs, readNecessaryConfigs, writeConfigs };
