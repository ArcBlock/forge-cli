const base64 = require('base64-url');
const get = require('lodash/get');
const semver = require('semver');
const TOML = require('@iarna/toml');
const { fromSecretKey } = require('@arcblock/forge-wallet');
const { bytesToHex, hexToBytes, isHexStrict } = require('@arcblock/forge-util');

const { print, printError, printInfo, printSuccess } = require('core/util');
const debug = require('core/debug')('moderator');

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
  if (!sk) {
    printInfo('moderator sk was not set');
    return undefined;
  }

  const wallet = fromSecretKey(sk);
  const pk = base64.escape(base64.encode(hexToBytes(wallet.publicKey)));
  return {
    address: wallet.toAddress(),
    pk,
    publicKey: pk, // TODO: removed?
  };
}

const getModeratorFromChain = async (client, currentVersion) => {
  if (semver.lt(currentVersion, '0.38.0')) {
    const res = await client.getConfig();
    const configString = get(res.$format(), 'config');
    const config = TOML.parse(configString);

    return get(config, 'forge.moderator', null);
  }

  const res = await client.getForgeState();
  return get(res.$format(), 'state.accountConfig.moderator', null);
};

// eslint-disable-next-line consistent-return
const ensureModerator = async (client, { currentVersion }) => {
  debug('ensureModerator:currentVersion', currentVersion);

  const sk = getModeratorSecretKey();
  if (!sk) {
    printError('The moderator sk was not set in your environment.');
    print();
    printInfo('The moderator sk can be set by ways:');
    print('  1. set moderatorSecretKey in ~/.forgerc.yml:');
    print('    moderatorSecretKey: xxx');
    print('  2. set FORGE_MODERATOR_SK in your shell profile:');
    print('    export FORGE_MODERATOR_SK=xxx');
    print();
    process.exit(1);
  }

  const chainModerator = await getModeratorFromChain(client, currentVersion);
  debug('moderator on chain', chainModerator);

  if (!chainModerator) {
    printError('There is not moderator set on the chain, so the operation can\'t be done.'); // prettier-ignore
    process.exit(1);
  }

  const localModerator = fromSecretKey(sk);
  if (localModerator.toAddress() !== chainModerator.address) {
    printError('Local moderator sk does not match the chain\'s moderator'); // prettier-ignore
    process.exit(1);
  }

  printSuccess('moderator checked success');
  return localModerator;
};

module.exports = {
  ensureModerator,
  getModerator,
};
