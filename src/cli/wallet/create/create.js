const shell = require('shelljs');
const inquirer = require('inquirer');
const base64 = require('base64-url');
const { types } = require('@arcblock/mcrypto');
const { fromRandom, WalletType } = require('@arcblock/forge-wallet');
const { toBase58, hexToBytes } = require('@arcblock/forge-util');
const { pretty } = require('core/ui');

const { questions } = require('../../account/create/create');

async function main({ opts: { defaults } }) {
  let wallet = fromRandom();
  if (!defaults) {
    const { pk, hash, role } = await inquirer.prompt(
      questions.filter(x => ['role', 'pk', 'hash'].includes(x.name))
    );

    const type = WalletType({
      pk: types.KeyType[pk],
      hash: types.HashType[hash],
      role: types.RoleType[role],
      address: types.EncodingType.BASE58,
    });

    wallet = fromRandom(type);
  }

  let { encoding } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'encoding',
      default: ['BASE16'],
      message: 'Please select public/secret key encoding format:',
      choices: ['BASE16', 'BASE58', 'BASE64', 'BASE64_URL', 'BINARY'],
    },
  ]);

  const json = wallet.toJSON();
  if (!encoding.length) {
    encoding = ['BASE16'];
  }

  if (encoding.includes('BASE16')) {
    json.pk_base16 = json.pk;
    json.sk_base16 = json.sk;
  }
  if (encoding.includes('BASE58')) {
    json.pk_base58 = toBase58(json.pk);
    json.sk_base58 = toBase58(json.sk);
  }
  if (encoding.includes('BASE64')) {
    json.pk_base64 = Buffer.from(hexToBytes(json.pk)).toString('base64');
    json.sk_base64 = Buffer.from(hexToBytes(json.sk)).toString('base64');
  }
  if (encoding.includes('BASE64_URL')) {
    json.pk_base64_url = base64.encode(hexToBytes(json.pk));
    json.sk_base64_url = base64.encode(hexToBytes(json.sk));
  }
  if (encoding.includes('BINARY')) {
    json.pk_binary = hexToBytes(json.pk).join(',');
    json.sk_binary = hexToBytes(json.sk).join(',');
  }

  delete json.pk;
  delete json.sk;

  shell.echo(pretty(json));
}

exports.run = main;
exports.execute = main;
