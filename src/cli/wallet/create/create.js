const shell = require('shelljs');
const inquirer = require('inquirer');
const base64 = require('base64-url');
const { types } = require('@arcblock/mcrypto');
const { fromRandom, WalletType } = require('@arcblock/forge-wallet');
const { toHex, toBase58, hexToBytes } = require('@arcblock/forge-util');
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

  const { encoding } = await inquirer.prompt([
    {
      type: 'list',
      name: 'encoding',
      default: 'BASE16',
      message: 'Please select public/secret key encoding format:',
      choices: ['BASE16', 'BASE58', 'BASE64', 'BASE64_URL'],
    },
  ]);

  const json = wallet.toJSON();
  // prettier-ignore
  switch (encoding) {
  case 'BASE16':
    json.pk = toHex(json.pk);
    json.sk = toHex(json.sk);
    break;
  case 'BASE58':
    json.pk = toBase58(json.pk);
    json.sk = toBase58(json.sk);
    break;
  case 'BASE64':
    json.pk = Buffer.from(hexToBytes(json.pk)).toString('base64');
    json.sk = Buffer.from(hexToBytes(json.sk)).toString('base64');
    break;
  case 'BASE64_URL':
    json.pk = base64.encode(hexToBytes(json.pk));
    json.sk = base64.encode(hexToBytes(json.sk));
    break;
  default:
    break;
  }

  shell.echo(pretty(json));
}

exports.run = main;
exports.execute = main;
