const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const shell = require('shelljs');
const numeral = require('numeral');
const inquirer = require('inquirer');
const get = require('lodash/get');
const toml = require('@iarna/toml');
const base64 = require('base64-url');
const base64Img = require('base64-img');
const kebabCase = require('lodash/kebabCase');
const terminalImage = require('terminal-image');

const { fromSecretKey } = require('@arcblock/forge-wallet');
const { isValid, isFromPublicKey } = require('@arcblock/did');
const { bytesToHex, hexToBytes, isHexStrict } = require('@arcblock/forge-util');

const { requiredDirs, ensureConfigComment } = require('core/env');
const { symbols, hr, pretty } = require('core/ui');
const { printError, printSuccess } = require('core/util');
const debug = require('core/debug')('config:lib');
const { getProfileDirectory } = require('core/forge-fs');
const { setFilePathOfConfig } = require('core/forge-config');

function getModeratorSecretKey() {
  const sk = process.env.FORGE_MODERATOR_SK;

  if (!sk) {
    return undefined;
  }

  if (isHexStrict(sk)) {
    return sk;
  }

  return bytesToHex(Buffer.from(base64.unescape(sk), 'base64'));
}

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

function getModerator() {
  const sk = getModeratorSecretKey();
  if (sk) {
    return fromSecretKey(sk);
  }

  return undefined;
}

async function askUserConfigs(defaults, chainName = '', isCreate) {
  const tokenDefaults = Object.assign(
    {
      name: 'ArcBlock',
      symbol: 'ABT',
      unit: 'arc',
      description: 'Forge token ABT',
      icon:
        'data:image/png;base64,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',
      decimal: 16,
      initial_supply: 100000000,
      total_supply: 100000000,
      inflation_rate: 0,
    },
    defaults.forge.token || {}
  );

  const pokeDefaults = {
    address: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
    balance: 1460000,
    daily_limit: 1000,
    amount: 10,
  };

  // default icon file
  const iconFile = path.join(requiredDirs.tmp, 'token.png');
  shell.exec(`rm -f ${iconFile}`);
  base64Img.imgSync(tokenDefaults.icon, requiredDirs.tmp, 'token');

  // moderator
  const moderator = getModerator();

  const questions = [];

  const chainNameValidateFunc = v => {
    if (!v) return 'The chain name should not be empty';
    if (!/^[a-zA-Z][a-zA-Z0-9_\-\s]{3,23}$/.test(v)) {
      return 'The chain name should start with a letter, only contain 0-9,a-z,A-Z, and length between 4~24';
    }

    if (fs.existsSync(getProfileDirectory(v))) {
      if (isCreate || (!isCreate && v !== chainName)) {
        return 'The chain name is exists, please use another one';
      }
    }

    return true;
  };

  if (isCreate) {
    const chainNameValidateResult = chainNameValidateFunc(chainName);
    if (chainNameValidateResult === true) {
      printSuccess(`chain name: ${chainName}`);
    } else {
      printError(chainNameValidateResult);

      questions.push({
        type: 'text',
        name: 'name',
        message: 'Please input chain name:',
        validate: chainNameValidateFunc,
      });
    }
  } else {
    printSuccess(`chain name: ${chainName}`);
  }

  questions.push(
    ...[
      {
        type: 'number',
        name: 'blockTime',
        message: 'Please input block time (in seconds):',
        default: parseInt(defaults.tendermint.timeout_commit, 10),
        validate: getNumberValidator('block time'),
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
        // eslint-disable-next-line quotes
        message: "What's the token name?",
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
        // eslint-disable-next-line quotes
        message: "What's the token symbol?",
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
        // eslint-disable-next-line quotes
        message: "What's the token icon?",
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
        default: tokenDefaults.initial_supply,
        when: d => d.customizeToken,
        validate: getNumberValidator('initial supply'),
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
        default: defaults.forge.poke && defaults.forge.poke.amount,
      },
      {
        type: 'confirm',
        name: 'customizePoke',
        message: 'Do you want to customize "feel lucky" (poke) config for this chain?',
        when: d => d.enablePoke,
        default: true,
      },
      {
        type: 'number',
        name: 'pokeAmount',
        message: 'How much token to give on a successful poke?',
        default: defaults.forge.poke ? defaults.forge.poke.amount : pokeDefaults.amount,
        when: d => d.customizePoke,
        validate: getNumberValidator('poke amount', false),
        transformer: v => numeral(v).format('0,0.0000'),
      },
      {
        type: 'number',
        name: 'pokeDailyLimit',
        message: 'How much token can be poked daily?',
        default: d => d.pokeAmount * 1000,
        when: d => d.customizePoke,
        validate: getNumberValidator('daily poke limit', false),
        transformer: v => numeral(v).format('0,0'),
      },
      {
        type: 'number',
        name: 'pokeBalance',
        message: 'How much token can be poked in total?',
        default: d =>
          Math.min(
            d.pokeDailyLimit * 365 * 4,
            d.tokenInitialSupply ||
              get(defaults, 'forge.token.initial_supply') ||
              tokenDefaults.initial_supply
          ),
        when: d => d.customizePoke,
        validate: getNumberValidator('total poke amount', false),
        transformer: v => numeral(v).format('0,0'),
      },
      {
        type: 'confirm',
        name: 'includeModerator',
        message: 'Do you want to include moderator config in the config?',
        when: () => moderator,
        default: true,
      },
      {
        type: 'confirm',
        name: 'moderatorAsTokenHolder',
        message: d => {
          const total = d.customizeToken ? d.tokenInitialSupply : tokenDefaults.initial_supply;
          // eslint-disable-next-line no-nested-ternary
          const poked = d.enablePoke ? (d.customizePoke ? d.pokeBalance : pokeDefaults.balance) : 0;
          const symbol = d.customizeToken ? d.tokenSymbol : tokenDefaults.symbol;
          return `Set moderator as token owner of (${total - poked} ${symbol}) on chain start?`;
        },
        when: () => moderator,
        default: true,
      },
      {
        type: 'text',
        name: 'tokenHolderAddress',
        message:
          'Please input token holder address (run `forge wallet:create` to generate if do not have one)',
        validate: v => {
          if (!v.trim()) return 'Token holder address should not be empty';
          if (!isValid(v.trim())) return 'Token holder address must be valid did';
          return true;
        },
        when: d => d.moderatorAsTokenHolder === false || !moderator,
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
        when: d => d.moderatorAsTokenHolder === false || !moderator,
        default: '',
      },
    ]
  );

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
    includeModerator,
    enablePoke,
    customizePoke,
    pokeBalance,
    pokeDailyLimit,
    pokeAmount,
    moderatorAsTokenHolder,
    tokenHolderAddress,
    tokenHolderPk,
  } = await inquirer.prompt(questions);

  defaults.tendermint.moniker = name;
  defaults.app.name = name;
  defaults.tendermint.timeout_commit = `${blockTime}s`;
  defaults.tendermint.genesis.chain_id = kebabCase(name);

  // token config
  defaults.forge.token = tokenDefaults;
  if (customizeToken) {
    if (tokenIcon !== iconFile) {
      shell.echo(hr);
      shell.echo('Token Icon');
      shell.echo(hr);
      shell.echo(await terminalImage.file(tokenIcon));
    }

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
    defaults.forge.poke = pokeDefaults;
    if (customizePoke) {
      defaults.forge.poke.balance = Number(pokeBalance || defaults.forge.poke.balance);
      defaults.forge.poke.daily_limit = Number(pokeDailyLimit || defaults.forge.poke.daily_limit);
      defaults.forge.poke.amount = Number(pokeAmount || defaults.forge.poke.amount);
    }
  } else {
    defaults.forge.poke = {};
    defaults.forge.poke.balance = 0;
    defaults.forge.poke.daily_limit = 0;
    defaults.forge.poke.amount = 0;
  }

  // moderator config
  if (includeModerator) {
    if (!defaults.forge.moderator) {
      defaults.forge.moderator = {};
    }
    defaults.forge.moderator.address = moderator.toAddress();
    defaults.forge.moderator.publicKey = base64.escape(
      base64.encode(hexToBytes(moderator.publicKey))
    );
  }

  // accounts config
  const total = customizeToken ? tokenInitialSupply : tokenDefaults.initial_supply;
  // eslint-disable-next-line no-nested-ternary
  const poked = enablePoke ? (customizePoke ? pokeBalance : pokeDefaults.balance) : 0;
  if (moderatorAsTokenHolder) {
    defaults.forge.accounts = [
      {
        address: moderator.toAddress(),
        pk: base64.escape(base64.encode(hexToBytes(moderator.publicKey))),
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

  shell.echo(hr);
  shell.echo('Config Preview');
  shell.echo(hr);
  shell.echo(pretty(result));
  shell.echo(hr);

  return result;
}

async function writeConfigs(targetPath, configs, overwrite = true) {
  if (fs.existsSync(targetPath) && !overwrite) {
    debug('config file exists');
    return;
  }

  fs.writeFileSync(targetPath, ensureConfigComment(toml.stringify(configs)));
  const docUrl = 'https://docs.arcblock.io/forge/latest/core/configuration.html!';
  shell.echo(`${symbols.success} config file ${chalk.cyan(targetPath)} is updated!`);
  shell.echo(`${symbols.info} full configuration documentation: ${docUrl}`);
  shell.echo(hr);
  shell.echo(`${symbols.info} you need to restart the chain to load the new config!`);
}

module.exports = { askUserConfigs, writeConfigs };
