const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Mcrypto = require('@arcblock/mcrypto');
const { createRpcClient } = require('core/env');
const { ensureModerator } = require('core/moderator');
const { getChainVersion } = require('core/libs/common');
const { isFile, getChainDirectory } = require('core/forge-fs');
const { fromBase64, toHex, toBuffer } = require('@arcblock/forge-util');
const { fromSecretKey, WalletType } = require('@arcblock/forge-wallet');
const { printError, printWarning, printInfo, printSuccess } = require('core/util');

const debug = require('core/debug')('declare:node');

// Get validator/node key info
const getKeyInfo = (keyFilePath, role, upper = true) => {
  if (!isFile(keyFilePath)) {
    throw new Error('keyFilePath is not a file');
  }

  const json = JSON.parse(fs.readFileSync(keyFilePath));

  const type = WalletType({
    role,
    hash: Mcrypto.types.HashType.SHA2,
    pk: Mcrypto.types.KeyType.ED25519,
  });
  const hasher = Mcrypto.getHasher(Mcrypto.types.HashType.SHA2);

  const sk = toHex(fromBase64(json.priv_key.value));
  const wallet = fromSecretKey(sk, type);
  const hash = hasher(toBuffer(wallet.publicKey), 1).slice(2, 42); // prettier-ignore

  return { moniker: upper ? hash.toUpperCase() : hash, wallet };
};

const getNodeKeyInfo = chainDir =>
  getKeyInfo(path.join(chainDir, 'keys', 'node_key.json'), Mcrypto.types.RoleType.ROLE_NODE, false);

const getValidatorKeyInfo = chainDir =>
  getKeyInfo(
    path.join(chainDir, 'keys', 'priv_validator_key.json'),
    Mcrypto.types.RoleType.ROLE_VALIDATOR,
    true
  );

// Wrap the stream to get just one account state
const getAccountState = (client, address) =>
  new Promise(async (resolve, reject) => {
    const stream = await client.getAccountState({ address });
    stream.on('data', data => resolve(data));
    stream.on('error', err => reject(err));
  });

async function main({ opts: { chainName, validator } }) {
  debug('params', { chainName, validator });
  const prefix = validator ? 'Validator' : 'Node';
  const client = createRpcClient();

  // 0. Get node/validator wallet and hash
  const chainDir = getChainDirectory(chainName);
  const { wallet, moniker } = validator ? getValidatorKeyInfo(chainDir) : getNodeKeyInfo(chainDir);
  debug('wallet', { wallet, moniker });

  // 1. Ensure we have not declared yet
  const address = wallet.toAddress();
  printWarning(`Declare ${prefix} can only be done on the node host machine`);
  printInfo(`${prefix} address is ${chalk.cyan(address)}`);
  const { state: account } = await getAccountState(client, address);
  if (account) {
    printError(`${prefix} is already declared on chain`);
    printInfo(`Run ${chalk.cyan(`forge account ${address}`)} to check account state`);
    process.exit(1);
  }

  const tryDeclare = async action => {
    try {
      const hash = await action();
      printSuccess(`${prefix} successfully declared on chain`);
      printInfo(`Run ${chalk.cyan(`forge tx ${hash}`)} to check transaction`);
      printInfo(`Run ${chalk.cyan(`forge account ${address}`)} to check account state`);
    } catch (err) {
      debug.error(err);
      printError(`${prefix} declare failed`, err.message);
    }
  };

  // 2. Determine whether we should do a restricted declare
  const { state } = await client.getForgeState();
  const isRestricted = state.txConfig.declare.restricted;
  if (isRestricted) {
    // TODO: allow user to input issuer sk/pk/address
    printInfo(`Chain ${chainName} has enabled restricted declare, we will use moderator as issuer`);

    const currentVersion = getChainVersion(chainName);
    const issuer = await ensureModerator(client, { currentVersion });
    const tx1 = await client.signDeclareTx({
      tx: { nonce: 1, itx: { moniker, issuer: issuer.toAddress() } },
      wallet,
    });
    const tx2 = await client.multiSignDeclareTx({ tx: tx1, wallet: issuer });
    tryDeclare(() => client.sendDeclareTx({ tx: tx2, wallet }));
  } else {
    tryDeclare(() => client.sendDeclareTx({ tx: { nonce: 1, itx: { moniker } }, wallet }));
  }
}

exports.run = main;
exports.execute = main;
