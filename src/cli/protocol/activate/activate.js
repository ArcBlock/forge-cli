/* eslint-disable no-console */
const inquirer = require('inquirer');
const shell = require('shelljs');
const chalk = require('chalk');
const { createRpcClient } = require('core/env');
const { printError, printInfo, printSuccess } = require('core/util');
const { ensureModerator } = require('../deploy/deploy');

const doActivate = async (client, address, moderator) => {
  try {
    const chainName = process.env.FORGE_CURRENT_CHAIN;
    const hash = await client.sendActivateProtocolTx({
      tx: {
        itx: { address },
      },
      wallet: moderator,
    });
    printSuccess(`Protocol ${address} successfully activated`);
    printInfo(`Run ${chalk.cyan(`forge tx ${hash} -c ${chainName}`)} to inspect the transaction`);
  } catch (err) {
    printError(`Protocol ${address} activate failed`);
    printError.error(err);
  }
};

const ensureProtocols = async (client, op) => {
  const { state } = await client.getForgeState();
  const protocols = await Promise.all(
    state.protocolsList.map(
      ({ address }) =>
        new Promise(resolve => {
          const stream = client.getProtocolState({ address });
          stream.on('data', res => resolve(res.state));
        })
    )
  );

  if (!protocols.some(x => x.itx.name === op)) {
    shell.echo(
      `${op}_tx not installed on your chain, please install it with ${chalk.cyan(
        'forge protocol:deploy'
      )}`
    );
    process.exit(1);
  }

  // Get protocols that are disabled
  const choices = protocols
    .filter(x => (op === 'activate_protocol' ? x.status : x.status === 0))
    .sort((a, b) => {
      if (a.itx.name > b.itx.name) {
        return 1;
      }
      if (a.itx.name < b.itx.name) {
        return -1;
      }

      return 0;
    })
    .map(({ itx: { name, address } }) => ({
      name,
      address,
    }));

  return choices;
};

async function main({ args: [id = ''] }) {
  const client = createRpcClient();
  const moderator = await ensureModerator(client);

  const choices = await ensureProtocols(client, 'activate_protocol');

  // Fast return if all protocols are running
  if (!choices.length) {
    shell.echo('All installed protocols are running, no need to activate');
    process.exit(0);
    return;
  }

  // Disable by id
  if (id) {
    const protocol = choices.find(x => x.name === id || x.address === id);
    if (protocol) {
      await doActivate(client, protocol.address, moderator);
    } else {
      shell.echo(`Protocol ${id} not found`);
      process.exit(1);
    }

    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'address',
      message: 'Please select protocol to activate:',
      choices: choices.map(({ name, address }) => ({
        name: `${address} - ${name}`,
        value: address,
      })),
    },
  ]);

  await doActivate(client, answers.address, moderator);
}

exports.run = main;
exports.execute = main;
exports.ensureProtocols = ensureProtocols;
