const inquirer = require('inquirer');
const globalConfig = require('core/libs/global-config');
const { pretty } = require('core/ui');
const { print } = require('core/util');

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

function execute(data) {
  print(data);
}

const printConfigs = configs => {
  print(pretty(configs));
};

function run({ args: [item, value], opts: { list } }) {
  if (list === true || typeof item === 'undefined') {
    printConfigs(globalConfig.getGlobalConfig());
  } else if (typeof value !== 'undefined') {
    globalConfig.setConfig(item, value);
  } else {
    const itemValue = globalConfig.getConfig(item);
    if (typeof itemValue !== 'undefined') {
      print(itemValue);
    }
  }
}

exports.run = run;
exports.execute = execute;
