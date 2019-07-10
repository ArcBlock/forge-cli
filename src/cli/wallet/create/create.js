const shell = require('shelljs');
const inquirer = require('inquirer');
const { types } = require('@arcblock/mcrypto');
const { fromRandom, WalletType } = require('@arcblock/forge-wallet');
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

  shell.echo(pretty(wallet.toJSON()));
}

exports.run = main;
exports.execute = main;
