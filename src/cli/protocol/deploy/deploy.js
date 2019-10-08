const path = require('path');
const shell = require('shelljs');
const chalk = require('chalk');
const base64 = require('base64-url');
const { toItxAddress } = require('@arcblock/did-util');
const { bytesToHex } = require('@arcblock/forge-util');
const { symbols } = require('core/ui');
const { sleep } = require('core/util');
const { isFile } = require('core/forge-fs');
const { createRpcClient } = require('core/env');
const { ensureModerator } = require('core/moderator');
const debug = require('core/debug')('deploy');

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
