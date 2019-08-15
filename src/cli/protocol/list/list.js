const shell = require('shelljs');
const Table = require('cli-table-redemption');
const { messages } = require('@arcblock/forge-proto');
const { createRpcClient } = require('core/env');
const { printError } = require('core/util');

const ensureProtocols = async client => {
  const { state } = await client.getForgeState();
  try {
    const protocols = await Promise.all(
      state.protocolsList.map(
        ({ address }) =>
          new Promise((resolve, reject) => {
            const stream = client.getProtocolState({ address });
            stream.on('data', res => resolve(res.state));
            stream.on('error', reject);
          })
      )
    );
    return protocols.map(x => ({
      name: x.itx.name,
      address: x.itx.address,
      status: x.status,
    }));
  } catch (err) {
    printError('Failed to fetch protocol list');
    return [];
  }
};

async function main() {
  const client = createRpcClient();
  const protocols = await ensureProtocols(client);

  // Fast return if all protocols are running
  if (!protocols.length) {
    shell.echo('No transaction protocols installed');
    process.exit(0);
    return;
  }

  const table = new Table({
    head: ['Name', 'Address', 'Status'],
    style: { 'padding-left': 1, head: ['cyan', 'bold'], compact: true },
    colWidths: [25, 50, 15],
  });

  protocols.forEach(x => {
    table.push([x.name, x.address, messages.ProtocolStatus[x.status].toLowerCase()]);
  });

  shell.echo(table.toString());
}

exports.run = main;
exports.execute = main;
