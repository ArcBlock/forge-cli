/* eslint-disable no-console */
const inquirer = require('inquirer');
const chalk = require('chalk');
const { createRpcClient } = require('core/env');
const { printError, printWarning, printInfo, printSuccess } = require('core/util');
const { getChainVersion } = require('core/libs/common');
const { ensureModerator } = require('core/moderator');
const { ensureProtocols } = require('../list/list');

const doDeactivate = async (client, address, moderator) => {
  try {
    const chainName = process.env.FORGE_CURRENT_CHAIN;
    const hash = await client.sendDeactivateProtocolTx({
      tx: {
        itx: { address },
      },
      wallet: moderator,
    });
    printSuccess(`Contract ${address} successfully deactivated`);
    printInfo(`Run ${chalk.cyan(`forge tx ${hash} -c ${chainName}`)} to inspect the transaction`);
  } catch (err) {
    printError(`Contract ${address} deactivate failed`, err);
  }
};

async function main({ args: [id = ''], opts: { chainName } }) {
  const client = createRpcClient();
  const currentVersion = getChainVersion(chainName);
  const moderator = await ensureModerator(client, { currentVersion });
  const choices = await ensureProtocols(client, 'deactivate_protocol');

  // Fast return if all contracts are running
  if (!choices.length) {
    printWarning('All installed contracts are disabled, nothing to deactivate');
    process.exit(0);
    return;
  }

  // Disable by id
  if (id) {
    const contract = choices.find(x => x.name === id || x.address === id);
    if (contract) {
      await doDeactivate(client, contract.address, moderator);
    } else {
      printError(`Contract ${id} not found`);
      process.exit(1);
    }

    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'address',
      message: 'Please select contract to deactivate:',
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
