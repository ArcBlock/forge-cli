const path = require('path');
const shell = require('shelljs');
const chalk = require('chalk');
const base64 = require('base64-url');
const semver = require('semver');
const { toItxAddress } = require('@arcblock/did-util');
const { fromSecretKey } = require('@arcblock/forge-wallet');
const { bytesToHex, hexToBytes, isHexStrict } = require('@arcblock/forge-util');
const { symbols } = require('core/ui');
const { printError, printInfo, sleep } = require('core/util');
const { isFile } = require('core/forge-fs');
const { config, createRpcClient } = require('core/env');
const debug = require('core/debug')('deploy');

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

function ensureModeratorDeclared(client, wallet) {
  return new Promise((resolve, reject) => {
    const stream = client.getAccountState({ address: wallet.toAddress() });
    let account = null;
    stream.on('data', ({ code, state }) => {
      if (code === 0 && state) {
        account = state;
      }
    });
    stream.on('end', async () => {
      if (account) {
        resolve(account);
      } else {
        const hash = await client.sendDeclareTx({
          tx: {
            itx: { moniker: 'moderator' },
          },
          wallet,
        });
        shell.echo(`${symbols.info} moderator declared ${hash}`);
        resolve(hash);
      }
    });

    stream.on('error', reject);
  });
}

// eslint-disable-next-line consistent-return
const ensureModerator = async client => {
  const sk = ensureModeratorSecretKey();
  const moderator = fromSecretKey(sk);
  printInfo(`moderator address ${moderator.toAddress()}`);

  let moderatorKey = 'forge.prime.moderator';
  const currentVersion = config.get('cli.currentVersion');

  if (semver.lt(currentVersion, '0.38.0')) {
    moderatorKey = 'forge.moderator';
  }

  if (!config.get(`${moderatorKey}.address`)) {
    printError('Abort because forge.moderator is not set in config file');
    printInfo(
      `Please add following content in config file ${chalk.cyan(
        config.get('cli.forgeConfigPath')
      )},`
    );
    printInfo(`${chalk.red('then restart current forge:')}`);
    shell.echo(`
[${moderatorKey}]
address = "${moderator.toAddress()}"
publicKey = "${base64.escape(base64.encode(hexToBytes(moderator.publicKey)))}"
`);

    process.exit(1);
  }

  try {
    await ensureModeratorDeclared(client, moderator);
    shell.echo(`${symbols.success} moderator declared on chain`);
    return moderator;
  } catch (err) {
    shell.echo(`${symbols.error} ${err.message}`);
  }
};

async function main({ args: [itxPath] }) {
  try {
    const itxFile = path.resolve(itxPath);
    if (!isFile(itxFile)) {
      shell.echo(`${symbols.error} itx.json file ${itxFile} not exists`);
      process.exit(1);
    }

    const client = createRpcClient();
    const moderator = await ensureModerator(client);
    if (!moderator) {
      return;
    }

    // eslint-disable-next-line no-underscore-dangle
    shell.echo(`${symbols.info} deploy protocol to ${client._endpoint}`);

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
    await sleep(5000);
    shell.echo(`${symbols.info} inspect tx with ${chalk.cyan(`forge tx ${hash}`)}`);
  } catch (err) {
    debug.error(err);
    shell.echo(`${symbols.error} transaction protocol deploy failed: ${err.message}`);
  }
}

exports.run = main;
exports.execute = main;
exports.ensureModerator = ensureModerator;
