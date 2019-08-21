const shell = require('shelljs');
const Table = require('cli-table-redemption');
const { messages } = require('@arcblock/forge-proto');
const { createRpcClient } = require('core/env');
const { printError, printWarning } = require('core/util');

const ensureProtocols = async (client, op) => {
  const { state } = await client.getForgeState();
  try {
    const protocolsRaw = await Promise.all(
      state.protocolsList.map(
        ({ address }) =>
          new Promise((resolve, reject) => {
            const stream = client.getProtocolState({ address });
            stream.on('data', res => resolve(res.state));
            stream.on('error', reject);
          })
      )
    );
    const protocols = protocolsRaw.map(x => ({
      name: x.itx.name,
      address: x.itx.address,
      version: x.itx.version,
      status: x.status,
    }));

    // Get protocols that are disabled
    const choices = protocols
      .filter(x => (op === 'activate_protocol' ? x.status : x.status === 0))
      .sort((a, b) => {
        if (a.name > b.name) {
          return 1;
        }
        if (a.name < b.name) {
          return -1;
        }

        return 0;
      });

    return choices;
  } catch (err) {
    printError('Failed to fetch protocol list', err);
    return [];
  }
};

async function main() {
  const client = createRpcClient();
  const protocols = await ensureProtocols(client);

  // Fast return if all protocols are running
  if (!protocols.length) {
    printWarning('No transaction protocols installed');
    process.exit(0);
    return;
  }

  const table = new Table({
    head: ['Name', 'Address', 'Status', 'Version'],
    style: { 'padding-left': 1, head: ['cyan', 'bold'], compact: true },
    colWidths: [25, 40, 15, 10],
  });

  protocols.forEach(x => {
    table.push([
      x.name,
      x.address,
      messages.ProtocolStatus[x.status].toLowerCase(),
      `v${x.version}`,
    ]);
  });

  shell.echo(table.toString());
}

exports.run = main;
exports.execute = main;
exports.ensureProtocols = ensureProtocols;
