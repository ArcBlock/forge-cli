const shell = require('shelljs');

const { symbols } = require('core/ui');

const Common = {
  print: content => {
    shell.echo(`${content}`);
  },
  printInfo: content => {
    shell.echo(`${symbols.info} ${content}`);
  },
  printSuccess: content => {
    shell.echo(`${symbols.success} ${content}`);
  },
  printWarning: content => {
    shell.echo(`${symbols.warning} ${content}`);
  },
  printError: content => {
    shell.echo(`${symbols.error} ${content}`);
  },
};

module.exports = Common;
