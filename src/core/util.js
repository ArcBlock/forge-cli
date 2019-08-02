const crypto = require('crypto');
const figlet = require('figlet');
const shell = require('shelljs');
const chalk = require('chalk');
const getPort = require('get-port');

const prettyMilliseconds = require('pretty-ms');
const { symbols, hr } = require('./ui');
const debug = require('./debug')('util');

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

function print(content = '') {
  shell.echo(`${content}`);
}

function printInfo(content) {
  print(`${symbols.info} ${content}`);
}

function printSuccess(content) {
  print(`${symbols.success} ${content}`);
}

function printWarning(content) {
  print(`${symbols.warning} ${content}`);
}

function printError(content) {
  debug(content);
  print(`${symbols.error} ${content}`);
}

/**
 * Check if the port is a free port, if it's available return it, or return -1
 * @param {*} port
 */
async function checkPort(port) {
  const tmp = await getPort({ host: '127.0.0.1', port });
  if (+tmp === +port) {
    return port;
  }

  return -1;
}

/**
 * Get one of free port from expected ports, if none, will return -1
 * @param {*} ports An array of expected ports
 */
async function getPorts(ports) {
  // eslint-disable-next-line
  for (const port of ports) {
    const tmp = await checkPort(port); // eslint-disable-line
    if (tmp !== -1) {
      return tmp;
    }
  }

  return -1;
}

/**
 * Get one of free port from expected ports, if none, will return -1
 * @param {array|string|number} port
 */
async function getFreePort(port) {
  if (Array.isArray(port)) {
    return getPorts(port);
  }

  return checkPort(port);
}

const printCurrentChain = currentChainName => {
  print(hr);
  print(`${symbols.success} Current Chain: ${chalk.cyan(currentChainName)}`);
  print(hr);
};

module.exports = {
  getPort,
  getFreePort,
  md5,
  prettyTime,
  print,
  printLogo,
  printCurrentChain,
  printError,
  printInfo,
  printSuccess,
  printWarning,
  sleep,
};
