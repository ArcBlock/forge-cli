/* eslint-disable no-console */
const inquirer = require('inquirer');
const shell = require('shelljs');
const chalk = require('chalk');
const { createRpcClient } = require('core/env');
const { printError, printInfo, printSuccess } = require('core/util');
const { ensureModerator } = require('../deploy/deploy');
const { ensureProtocols } = require('../activate/activate');

const doDeactivate = async (client, address, moderator) => {
  try {
    const chainName = process.env.FORGE_CURRENT_CHAIN;
    const hash = await client.sendDeactivateProtocolTx({
      tx: {
        itx: { address },
      },
      wallet: moderator,
    });
    printSuccess(`Protocol ${address} successfully deactivated`);
    printInfo(`Run ${chalk.cyan(`forge tx ${hash} -c ${chainName}`)} to inspect the transaction`);
  } catch (err) {
    printError(`Protocol ${address} deactivate failed`);
    printError.error(err);
  }
};

async function main({ args: [id = ''] }) {
  const client = createRpcClient();
  const moderator = await ensureModerator(client);
  const choices = await ensureProtocols(client, 'deactivate_protocol');

  // Fast return if all protocols are running
  if (!choices.length) {
    shell.echo('All installed protocols are disabled, nothing to deactivate');
    process.exit(0);
    return;
  }

  // Disable by id
  if (id) {
    const protocol = choices.find(x => x.name === id || x.address === id);
    if (protocol) {
      await doDeactivate(client, protocol.address, moderator);
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
      message: 'Please select protocol to deactivate:',
      choices: choices.map(({ name, address }) => ({
        name: `${address} - ${name}`,
        value: address,
      })),
    },
  ]);

  await doDeactivate(client, answers.address, moderator);
}

exports.run = main;
exports.execute = main;
