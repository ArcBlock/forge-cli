const { types } = require('@arcblock/mcrypto');
const { fromRandom, WalletType } = require('@arcblock/forge-wallet');
const { hexToBytes } = require('@arcblock/forge-util');
const base64 = require('base64-url');

function generateDefaultAccount() {
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
}

module.exports = {
  generateDefaultAccount,
};
