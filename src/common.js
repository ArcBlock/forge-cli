const shell = require('shelljs');
const prettyMilliseconds = require('pretty-ms');
const { symbols } = require('core/ui');

function prettyTime(ms) {
  let result = prettyMilliseconds(ms, { compact: true });
  if (result.startsWith('~')) {
    result = result.slice(1);
  }

  return result;
}

const Common = {
  prettyTime,
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
