const fs = require('fs');
const path = require('path');
const { isFile, getChainDirectory } = require('core/forge-fs');
const { createRpcClient } = require('core/env');
const { fromBase64, toHex, toBuffer } = require('@arcblock/forge-util');
const { fromSecretKey, WalletType } = require('@arcblock/forge-wallet');
const Mcrypto = require('@arcblock/mcrypto');

const { pretty } = require('core/ui');
const { printError, printWarning, printSuccess, print } = require('core/util');
const debug = require('core/debug')('declare');

const getKeyInfo = (keyFilePath, role) => {
  if (!isFile(keyFilePath)) {
    throw new Error('keyFilePath is not a file');
  }

  const json = JSON.parse(fs.readFileSync(keyFilePath));
  console.log(json);

  const type = WalletType({
    role,
    hash: Mcrypto.types.HashType.SHA2,
    pk: Mcrypto.types.KeyType.ED25519,
  });
  const hasher = Mcrypto.getHasher(Mcrypto.types.HashType.SHA2);

  const sk = toHex(fromBase64(json.priv_key.value));
  const result = fromSecretKey(sk, type).toJSON();
  const hash = hasher(toBuffer(result.pk), 1)
    .slice(2, 42)
    .toUpperCase();
  result.hash = hash;

  console.log(result);

  return result;
};

const getNodeKeyInfo = chainDir =>
  getKeyInfo(path.join(chainDir, 'keys', 'node_key.json'), Mcrypto.types.RoleType.ROLE_NODE);

const getValidatorKeyInfo = chainDir =>
  getKeyInfo(
    path.join(chainDir, 'keys', 'priv_validator_key.json'),
    Mcrypto.types.RoleType.ROLE_VALIDATOR
  );

async function main({ opts: { chainName } }) {
  const chainDir = getChainDirectory(chainName);
  // getNodeKeyInfo(chainDir);
  getValidatorKeyInfo(chainDir);
  return;

  const client = createRpcClient();
  try {
    const res = await client.declareNode({});
    printSuccess(`successfully declared current node as validator candidate`);
    print(pretty(res.$format()));
  } catch (err) {
    debug.error(err);
    printError(`declare node as validator candidate failed!`);
    printWarning(
      `If you are running forge in standalone mode,it is declared on init, you do not need to declare!` // eslint-disable-line
    );
  }
}

exports.run = main;
exports.execute = main;
