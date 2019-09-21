const base64 = require('base64-url');
const { fromSecretKey } = require('@arcblock/forge-wallet');
const { bytesToHex, hexToBytes, isHexStrict } = require('@arcblock/forge-util');

function getModeratorSecretKey() {
  const sk = process.env.FORGE_MODERATOR_SK;

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

module.exports = {
  getModerator,
};
