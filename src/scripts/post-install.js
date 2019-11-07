const chalk = require('chalk');
const emoji = require('node-emoji');

const { print } = require('../core/util');

print(`${emoji.get('tada')} Congratulations! Forge CLI installed successfully\n`);
print('It only takes 3 steps to create a new chain:');
print(`1. ${chalk.cyan('forge install')}`);
print(`2. ${chalk.cyan('forge chain:create')}`);
print(`3. ${chalk.cyan('forge start')}`);
