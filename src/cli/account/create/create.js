const chalk = require('chalk');
const shell = require('shelljs');
const inquirer = require('inquirer');
const { config, createRpcClient, cache } = require('core/env');
const { symbols, hr, pretty } = require('core/ui');
const { types } = require('@arcblock/mcrypto');

const questions = [
  {
    type: 'password',
    name: 'passphrase',
    message: 'Please input passphrase:',
    validate: input => {
      if (!input) return 'The passphrase should not empty';
      if (!/^.{6,15}$/.test(input)) return 'The passphrase length should between 6~25 char';
      return true;
    },
  },
  {
    type: 'text',
    name: 'moniker',
    message: 'Please input moniker:',
    validate: input => {
      if (!input) return 'The moniker should not empty';
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_]{3,15}$/.test(input)) {
        return 'The moniker should only contain 0-9,a-z,A-Z, and length between 3~15';
      }
      return true;
    },
  },
  {
    type: 'list',
    name: 'role',
    default: types.RoleType.ROLE_ACCOUNT,
    message: 'Please select a role type:',
    choices: Object.keys(types.RoleType),
  },
  {
    type: 'list',
    name: 'pk',
    default: types.KeyType.ED25519,
    message: 'Please select a key pair algorithm:',
    choices: Object.keys(types.KeyType),
  },
  {
    type: 'list',
    name: 'hash',
    default: types.HashType.SHA3,
    message: 'Please select a hash algorithm:',
    choices: Object.keys(types.HashType),
  },
];

// Execute the cli silently.
async function execute(data) {
  try {
    const client = createRpcClient();
    const { passphrase, moniker, pk, hash, role } = data;
    const res = await client.createWallet({
      passphrase,
      moniker,
      type: {
        pk: types.KeyType[pk],
        hash: types.HashType[hash],
        role: types.RoleType[role],
        address: types.EncodingType.BASE58,
      },
    });
    shell.echo(hr);
    shell.echo(`${symbols.success} account create success!`);
    shell.echo(hr);
    shell.echo(pretty(res.$format().wallet));

    // Unlock current wallet and save to disk cache
    const { token } = await client.loadWallet({ address: res.wallet.address, passphrase });
    cache.write('wallet', {
      token,
      address: res.wallet.address,
      expireAt: Date.now() + config.get('forge.unlockTtl', 300) * 1e3,
    });
    shell.echo(hr);
    shell.echo(`${symbols.success} account unlocked!`);
    shell.echo(
      `${symbols.info} run ${chalk.cyan(
        `forge account ${res.wallet.address}`
      )} to inspect account state`
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('error', err);
  }
}

// Run the cli interactively
function run() {
  inquirer.prompt(questions).then(answers => {
    execute(answers);
  });
}

exports.run = run;
exports.execute = execute;
