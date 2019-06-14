const path = require('path');
const shell = require('shelljs');
const chalk = require('chalk');
const base64 = require('base64-url');
const Mcrypto = require('@arcblock/mcrypto');
const { toItxAddress } = require('@arcblock/did-util');
const { fromSecretKey, WalletType } = require('@arcblock/forge-wallet');
const { bytesToHex, isHexStrict } = require('@arcblock/forge-util');
const { symbols } = require('core/ui');
const { isFile, debug, createRpcClient } = require('core/env');

function ensureModeratorSecretKey() {
  const sk = process.env.FORGE_MODERATOR_SK;
  if (!sk) {
    shell.echo(`${symbols.error} please set FORGE_MODERATOR_SK to continue`);
    process.exit(1);
  }

  if (isHexStrict(sk)) {
    return sk;
  }

  // debug('detected base64 moderator sk', base64.unescape(sk));
  return bytesToHex(Buffer.from(base64.unescape(sk), 'base64'));
}

function ensureModeratorDeclared(client, address) {
  return new Promise((resolve, reject) => {
    const stream = client.getAccountState({ address });
    let account = null;
    stream.on('data', ({ code, state }) => {
      if (code === 0 && state) {
        account = state;
      }
    });
    stream.on('end', () => {
      if (account) {
        resolve(account);
      } else {
        reject(new Error('Moderator account not declared'));
      }
    });

    stream.on('error', reject);
  });
}

async function main({ args: [itxPath] }) {
  try {
    const itxFile = path.resolve(itxPath);
    if (!isFile(itxFile)) {
      shell.echo(`${symbols.error} itx.json file ${itxFile} not exists`);
      process.exit(1);
    }

    const type = WalletType({
      role: Mcrypto.types.RoleType.ROLE_ACCOUNT,
      pk: Mcrypto.types.KeyType.ED25519,
      hash: Mcrypto.types.HashType.SHA3,
    });

    const sk = ensureModeratorSecretKey();
    const moderator = fromSecretKey(sk, type);
    shell.echo(`${symbols.info} moderator address ${moderator.toAddress()}`);

    const client = createRpcClient();
    await ensureModeratorDeclared(client, moderator.toAddress());
    // eslint-disable-next-line no-underscore-dangle
    shell.echo(`${symbols.info} deploy protocol to ${client._endpoint}`);
    shell.echo(`${symbols.success} moderator declared on chain`);

    // eslint-disable-next-line
    const json = require(itxFile);
    const itxStr = json[Object.keys(json).shift()];
    const itxB64 = base64.unescape(itxStr);
    debug('itxB64', itxB64);

    const itxBuffer = Buffer.from(itxB64, 'base64');
    debug('itxBuffer', itxBuffer);

    const itxHex = bytesToHex(itxBuffer);
    debug('itxHex', itxHex.slice(2).toUpperCase());

    const DeployProtocolTx = client.getType('DeployProtocolTx');
    const itxObj = DeployProtocolTx.deserializeBinary(itxBuffer).toObject();
    itxObj.address = toItxAddress(itxObj, 'DeployProtocolTx');
    shell.echo('transaction protocol detail', itxObj);

    const hash = await client.sendDeployProtocolTx({
      tx: {
        nonce: 0,
        itx: itxObj,
      },
      wallet: moderator,
    });
    shell.echo(`${symbols.success} transaction protocol deploy success`);
    shell.echo(`${symbols.info} inspect tx with ${chalk.cyan(`forge tx ${hash}`)}`);
  } catch (err) {
    debug.error(err);
    shell.echo(`${symbols.error} transaction protocol deploy failed: ${err.message}`);
  }
}

exports.run = main;
exports.execute = main;
