const base64 = require('base64-url');
const chalk = require('chalk');
const semver = require('semver');
const { fromSecretKey } = require('@arcblock/forge-wallet');
const { bytesToHex, hexToBytes, isHexStrict } = require('@arcblock/forge-util');

const { print, printError, printInfo, printSuccess } = require('core/util');
const { config } = require('core/env');

const { getGlobalConfig } = require('./libs/global-config');

function getModeratorSecretKey() {
  const { moderatorSecretKey } = getGlobalConfig();
  const sk = process.env.FORGE_MODERATOR_SK || moderatorSecretKey;

  if (!sk) {
    return undefined;
  }

  if (isHexStrict(sk)) {
    return sk;
  }

  return bytesToHex(Buffer.from(base64.unescape(sk), 'base64'));
}

function getModerator() {
  const sk = getModeratorSecretKey();
  if (sk) {
    const wallet = fromSecretKey(sk);
    const pk = base64.escape(base64.encode(hexToBytes(wallet.publicKey)));
    return {
      address: wallet.toAddress(),
      pk,
      publicKey: pk, // TODO: removed?
    };
  }

  return undefined;
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
        printInfo(`moderator declared ${hash}`);
        resolve(hash);
      }
    });

    stream.on('error', reject);
  });
}

// eslint-disable-next-line consistent-return
const ensureModerator = async client => {
  const moderator = getModerator();
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
    print(`
[${moderatorKey}]
address = "${moderator.toAddress()}"
publicKey = "${base64.escape(base64.encode(hexToBytes(moderator.publicKey)))}"
`);

    process.exit(1);
  }

  try {
    await ensureModeratorDeclared(client, moderator);
    printSuccess('moderator declared on chain');
    return moderator;
  } catch (err) {
    printError(`${err.message}`);
  }
};

module.exports = {
  ensureModerator,
  getModerator,
};
