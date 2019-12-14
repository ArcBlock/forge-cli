const chalk = require('chalk');
const { print } = require('core/util');
const { cli, action } = require('core/cli');
const { execute, run } = require('./validator');

cli(
  'chain:validator',
  'Update(add, remove, change) or list validators',
  input => action(execute, run, input),
  {
    requirements: {
      forgeRelease: true,
      runningNode: true,
      rpcClient: true,
      wallet: false,
      chainName: true,
      chainExists: true,
      currentChainRunning: true,
    },
    options: [
      ['--address <validatorDid>', 'Which validator to update'],
      ['--power <votingPower>', 'Voting power to set to'],
    ],
    handlers: {
      '--help': () => {
        // prettier-ignore
        print(`
Examples:
- ${chalk.cyan('forge chain:validator')}                            List all validators
- ${chalk.cyan('forge chain:validator --address abc --power 10')}   Add new validator abc and set voting power to 10
- ${chalk.cyan('forge chain:validator --address abc --power 0')}    Delete validator with the address abc
- ${chalk.cyan('forge chain:validator --address abc --power 100')}  Update validator abc to set voting power to 100
      `);
      },
    },
  }
);
