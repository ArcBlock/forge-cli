const path = require('path');
const chalk = require('chalk');
const base64 = require('base64-url');
const { toItxAddress } = require('@arcblock/did-util');
const { bytesToHex } = require('@arcblock/forge-util');
const { messages } = require('@arcblock/forge-proto');
const { print, printError, printInfo, printSuccess, sleep } = require('core/util');
const { isFile } = require('core/forge-fs');
const { createRpcClient } = require('core/env');
const { getChainVersion } = require('core/libs/common');
const { ensureModerator } = require('core/moderator');
const { pretty } = require('core/ui');
const debug = require('core/debug')('deploy');

const { fetchContracts } = require('../list/list');

async function main({ args: [itxPath], opts: { chainName } }) {
  try {
    const itxFile = path.resolve(itxPath);
    if (!isFile(itxFile)) {
      printError(`itx.json file ${itxFile} not exists`);
      process.exit(1);
    }

    const client = createRpcClient();
    const currentVersion = getChainVersion(chainName);
    const moderator = await ensureModerator(client, { currentVersion });
    if (!moderator) {
      return;
    }

    // eslint-disable-next-line no-underscore-dangle
    printInfo(`Deploy contract to ${client._endpoint}`);

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

    const contracts = await fetchContracts(client);
    const contractOnChain = contracts.find(
      ({ name, version }) => itxObj.name === name && itxObj.version === version
    );

    if (contractOnChain) {
      contractOnChain.status = messages.ProtocolStatus[contractOnChain.status].toLowerCase();
      printError('Deploy failed: the contract has been deployed.');
      printInfo('Contract info:');
      print(pretty(contractOnChain));
      process.exit(1);
    }

    print('Transaction contract detail:');
    print(itxObj);

    const hash = await client.sendDeployProtocolTx({
      tx: {
        nonce: 0,
        itx: itxObj,
      },
      wallet: moderator,
    });
    printSuccess('Transaction contract deploy success');
    await sleep(5000);
    printInfo(`Inspect tx with ${chalk.cyan(`forge tx ${hash}`)}`);
  } catch (err) {
    debug.error(err);
    printError(`Transaction contract deploy failed: ${err.message}`);
  }
}

exports.run = main;
exports.execute = main;
