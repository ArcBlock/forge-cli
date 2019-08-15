/* eslint-disable no-console */
const inquirer = require('inquirer');
const chalk = require('chalk');
const { createRpcClient } = require('core/env');
const { printError, printWarning, printInfo, printSuccess } = require('core/util');
const { ensureModerator } = require('../deploy/deploy');
const { ensureProtocols } = require('../list/list');

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
    printError(`Protocol ${address} activate failed`, err);
  }
};

async function main({ args: [id = ''] }) {
  const client = createRpcClient();
  const moderator = await ensureModerator(client);
  const choices = await ensureProtocols(client, 'activate_protocol');

  // Fast return if all protocols are running
  if (!choices.length) {
    printWarning('All installed protocols are running, no need to activate');
    process.exit(0);
    return;
  }

  // Disable by id
  if (id) {
    const protocol = choices.find(x => x.name === id || x.address === id);
    if (protocol) {
      await doActivate(client, protocol.address, moderator);
    } else {
      printError(`Protocol ${id} not found`);
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
