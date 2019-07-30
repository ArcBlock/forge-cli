const crypto = require('crypto');
const figlet = require('figlet');
const shell = require('shelljs');
const chalk = require('chalk');

const prettyMilliseconds = require('pretty-ms');
const { symbols } = require('core/ui');

function prettyTime(ms) {
  let result = prettyMilliseconds(ms, { compact: true });
  if (result.startsWith('~')) {
    result = result.slice(1);
  }

  return result;
}

function printLogo() {
  shell.echo('');
  shell.echo(chalk.cyan(figlet.textSync('By ArcBlock', { font: 'ANSI Shadow' })));
}

const md5 = data =>
  crypto
    .createHash('md5')
    .update(data)
    .digest('hex');

function sleep(timeout = 1000) {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

function print(content) {
  shell.echo(`${content}`);
}

function printInfo(content) {
  shell.echo(`${symbols.info} ${content}`);
}

function printSuccess(content) {
  shell.echo(`${symbols.success} ${content}`);
}

function printWarning(content) {
  shell.echo(`${symbols.warning} ${content}`);
}

function printError(content) {
  shell.echo(`${symbols.error} ${content}`);
}

module.exports = {
  md5,
  prettyTime,
  printLogo,
  print,
  printError,
  printInfo,
  printSuccess,
  printWarning,
  sleep,
};
