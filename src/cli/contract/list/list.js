const Table = require('cli-table-redemption');
const { messages } = require('@arcblock/forge-proto');
const { createRpcClient } = require('core/env');
const { print, printError, printWarning } = require('core/util');

const fetchContracts = async client => {
  try {
    const { state } = await client.getForgeState();
    const contractsRaw = await Promise.all(
      state.protocolsList.map(
        ({ address }) =>
          new Promise((resolve, reject) => {
            const stream = client.getProtocolState({ address });
            stream.on('data', res => resolve(res.state));
            stream.on('error', reject);
          })
      )
    );

    const contracts = contractsRaw
      .map(x => ({
        name: x.itx.name,
        address: x.itx.address,
        version: x.itx.version,
        status: x.status,
      }))
      .sort((a, b) => {
        if (a.name > b.name) {
          return 1;
        }
        if (a.name < b.name) {
          return -1;
        }

        return 0;
      });

    return contracts;
  } catch (err) {
    printError('Failed to fetch contract list', err);
    return [];
  }
};

const ensureProtocols = async (client, op) => {
  const contracts = await fetchContracts(client);
  // Get contracts that are disabled
  const choices = contracts.filter(x => (op === 'activate_protocol' ? x.status : x.status === 0));

  return choices;
};

async function main() {
  const client = createRpcClient();
  const contracts = await fetchContracts(client);

  // Fast return if all contracts are running
  if (!contracts.length) {
    printWarning('No transaction contracts installed');
    process.exit(0);
    return;
  }

  const table = new Table({
    head: ['Name', 'Address', 'Status', 'Version'],
    style: { 'padding-left': 1, head: ['cyan', 'bold'], compact: true },
    colWidths: [25, 40, 15, 10],
  });

  contracts.forEach(x => {
    table.push([
      x.name,
      x.address,
      messages.ProtocolStatus[x.status].toLowerCase(),
      `v${x.version}`,
    ]);
  });

  print(table.toString());
}

exports.run = main;
exports.execute = main;
exports.ensureProtocols = ensureProtocols;
exports.fetchContracts = fetchContracts;
