/* eslint-disable function-paren-newline */
const chalk = require('chalk');
const inquirer = require('inquirer');
const Table = require('cli-table-redemption');
const { hr } = require('core/ui');
const { createRpcClient } = require('core/env');
const { ensureModerator } = require('core/moderator');
const { getChainVersion } = require('core/libs/common');
const { isValid } = require('@arcblock/did');
const { printError, printWarning, printInfo, printSuccess, print } = require('core/util');

const debug = require('core/debug')('chain:validator');

async function getQuestions(validators) {
  const validateVotingPower = input => {
    if (Number(input) <= 0) {
      return 'Validator voting power must be valid number';
    }

    return true;
  };

  const validateAddress = (input, shouldExist = false) => {
    if (!input) {
      return 'Validator address is required';
    }

    if (!isValid(input)) {
      return 'Validator address is not valid DID';
    }

    if (shouldExist && !validators.find(x => x.address === input)) {
      return 'Validator address must exist in the list';
    }

    if (!shouldExist && validators.find(x => x.address === input)) {
      return 'Validator already exists in the list';
    }

    return true;
  };

  const questions = [
    {
      type: 'list',
      name: 'action',
      message: 'How do you want to update validators',
      choices: ['add', 'update', 'remove'],
      default: 'add',
    },

    // When we want to add validator
    {
      type: 'text',
      name: 'newAddress',
      message: 'Please input validator address',
      when: inputs => inputs.action === 'add',
      validate: v => validateAddress(v, false),
      default: '',
    },
    {
      type: 'number',
      name: 'newVotingPower',
      message: 'Please input validator voting power',
      when: inputs => inputs.action === 'add',
      validate: validateVotingPower,
      default: 0,
    },

    // When we want to update existing validator
    {
      type: 'text',
      name: 'updateAddress',
      message: 'Please select validator address',
      when: inputs => inputs.action === 'update',
      validate: v => validateAddress(v, true),
      default: validators[validators.length - 1].address,
    },
    {
      type: 'number',
      name: 'updateVotingPower',
      message: 'Please input validator voting power',
      when: inputs => inputs.action === 'update',
      validate: validateVotingPower,
      default: validators[validators.length - 1].votingPower,
    },

    // When we want to delete existing validator
    {
      type: 'text',
      name: 'deleteAddress',
      message: 'Please select validator address',
      when: inputs => inputs.action === 'delete',
      validate: v => validateAddress(v, true),
      default: '',
    },

    // Confirm this operation
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Validator updating is dangerous, are you sure you want to proceed',
      default: false,
    },
  ];

  return questions;
}

function printValidators(validators) {
  const table = new Table({
    head: ['Address', 'VotingPower'],
    style: { 'padding-left': 1, head: ['cyan', 'bold'] },
    colWidths: [40, 15],
  });

  validators.forEach(x => table.push([x.address, x.votingPower]));
  print(table.toString());
}

function getAccountState(client, address) {
  return new Promise(async (resolve, reject) => {
    const stream = await client.getAccountState({ address });
    stream.on('data', data => resolve(data));
    stream.on('error', err => reject(err));
  });
}

async function main({ opts: { chainName } }) {
  const client = createRpcClient();
  const currentVersion = getChainVersion(chainName);
  const moderator = await ensureModerator(client, { currentVersion });

  const { validatorsInfo } = await client.getValidatorsInfo();
  const validators = validatorsInfo.validatorsList;

  print(hr);
  printWarning('If you are adding a new validator, please ensure the node is synced');
  printWarning(`If the node is node connected to the network, run ${chalk.cyan('forge join')} to connect`);
  print(hr);
  printInfo('Current validators');
  print(hr);
  printValidators(validators);

  const questions = await getQuestions(validators);
  const {
    action,
    newAddress,
    newVotingPower,
    updateAddress,
    updateVotingPower,
    deleteAddress,
    confirm,
  } = await inquirer.prompt(questions);

  if (!confirm) {
    printWarning('User aborted.');
    process.exit(0);
  }

  const updateValidators = async candidates => {
    try {
      const hash = await client.sendUpdateValidatorTx({ tx: { itx: { candidates } }, wallet: moderator });
      printSuccess(`Validator ${action} successfully`);
      printInfo(`Run ${chalk.cyan(`forge tx ${hash}`)} to check transaction`);
    } catch (err) {
      debug.error(err);
      printError(`Validator ${action} declare failed`, err.message);
    }
  };

  if (action === 'add') {
    const { state } = await getAccountState(client, newAddress);
    if (!state) {
      printError(
        `Validator not declared no chain, run ${chalk.cyan('forge declare:node')} on that node and then try again`
      );
      process.exit(1);
    }

    await updateValidators([{ address: newAddress, power: newVotingPower }]);
  }

  if (action === 'update') {
    await updateValidators([{ address: updateAddress, power: updateVotingPower }]);
  }

  if (action === 'remove') {
    await updateValidators([{ address: deleteAddress, power: 0 }]);
  }
}

exports.run = main;
exports.execute = main;
