const base64 = require('base64-url');
const get = require('lodash/get');
const semver = require('semver');
const chalk = require('chalk');
const TOML = require('@iarna/toml');
const { fromSecretKey } = require('@arcblock/forge-wallet');
const { bytesToHex, hexToBytes, isHexStrict } = require('@arcblock/forge-util');

const debug = require('core/debug')('moderator');

const { print, printError, printInfo, printSuccess } = require('./util');
const { getGlobalConfig } = require('./libs/global-config');

function formatWallet(wallet) {
  const pk = base64.escape(base64.encode(hexToBytes(wallet.publicKey)));
  return {
    address: wallet.toAddress(),
    pk,
    publicKey: pk,
  };
}

function formatSecretKey(sk) {
  if (!sk) {
    return undefined;
  }
  if (isHexStrict(sk)) {
    return sk;
  }

  return bytesToHex(Buffer.from(base64.unescape(sk), 'base64'));
}

function getModeratorSecretKey() {
  const { moderatorSecretKey } = getGlobalConfig();
  const sk = process.env.FORGE_MODERATOR_SK || moderatorSecretKey;

  return formatSecretKey(sk);
}

function getModerator() {
  const sk = getModeratorSecretKey();
  if (!sk) {
    debug('moderator sk was not set in local environment.');
    return undefined;
  }

  const wallet = fromSecretKey(sk);
  return formatWallet(wallet);
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
    printError('The moderator secret key not found in your environment.');
    print();
    printInfo('The moderator secret key can be set in either of the following ways:');
    print(`  1. set ${chalk.cyan('moderatorSecretKey')} in ${chalk.cyan('~/.forgerc.yml')}:`);
    print('    moderatorSecretKey: xxx');
    print(
      `  2. set ${chalk.cyan('FORGE_MODERATOR_SK')} in ${chalk.cyan('~/.bashrc')} or ${chalk.cyan(
        '~/.zshrc'
      )}:`
    );
    print('    export FORGE_MODERATOR_SK=xxx');
    print();
    process.exit(1);
  }

  const chainModerator = await getModeratorFromChain(client, currentVersion);
  debug('moderator on chain', chainModerator);

  if (!chainModerator) {
    printError('There is no moderator on the chain, so the operation can\'t be done.'); // prettier-ignore
    process.exit(1);
  }

  const localModerator = fromSecretKey(sk);
  if (localModerator.toAddress() !== chainModerator.address) {
    printError('Abort because moderator address from your env does not match the moderator in chain state'); // prettier-ignore
    print(`  - Local moderator: ${chalk.cyan(localModerator.toAddress())}`);
    print(`  - Remote moderator: ${chalk.cyan(chainModerator.address)}`);
    printInfo('To continue upgrade, please set the moderator secret key that have the same address in chain state in your env'); // prettier-ignore
    process.exit(1);
  }

  printSuccess('moderator checked success');
  return localModerator;
};

module.exports = {
  ensureModerator,
  formatWallet,
  formatSecretKey,
  getModerator,
};
