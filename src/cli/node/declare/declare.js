const shell = require('shelljs');
const { createRpcClient } = require('core/env');
const debug = require('core/debug')('declare');
const { symbols, pretty } = require('core/ui');

async function main() {
  const client = createRpcClient();
  try {
    const res = await client.declareNode({});
    shell.echo(`${symbols.success} successfully declared current node as validator candidate`);
    shell.echo(pretty(res.$format()));
  } catch (err) {
    debug.error(err);
    shell.echo(`${symbols.error} declare node as validator candidate failed!`);
    shell.echo(
      `${symbols.warning} If you are running forge in standalone mode,it is declared on init, you do not need to declare!` // eslint-disable-line
    );
  }
}

exports.run = main;
exports.execute = main;
