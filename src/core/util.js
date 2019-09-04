const path = require('path');
const fs = require('fs');
const os = require('os');
const axios = require('axios');
const crypto = require('crypto');
const figlet = require('figlet');
const shell = require('shelljs');
const chalk = require('chalk');
const url = require('url');
const getPort = require('get-port');
const prettyMilliseconds = require('pretty-ms');
const moment = require('moment');

const { symbols, hr } = require('./ui');
const { DEFAULT_CHAIN_NAME, MIRRORS, REQUIRED_DIRS } = require('../constant');
const debug = require('./debug')('util');

/**
 * return json string with indent
 * @param {object} json object
 * @returns {string} stringified json
 */
function prettyStringify(json) {
  return JSON.stringify(json, null, 4);
}

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

/**
 * Write log to file
 * @param {array} args
 */
const logError = args => {
  const content = args.map(item => (item instanceof Error ? item.stack : item)).join(os.EOL);
  fs.writeFileSync(
    path.join(REQUIRED_DIRS.logs, 'error.log'),
    `${moment().format('YYYY-MM-DD HH:mm:ss.ms')} ${content}${os.EOL}`,
    {
      flag: 'a+',
    }
  );
};

function print(...args) {
  shell.echo.apply(null, args);
}

function printInfo(...args) {
  print.apply(null, [symbols.info, ...args]);
}

function printSuccess(...args) {
  print.apply(null, [symbols.success, ...args]);
}

function printWarning(...args) {
  print.apply(null, [symbols.warning, ...args]);
}

function printError(...args) {
  debug(...args);
  logError(args);
  if (args.length && args[0] instanceof Error) {
    args[0] = args[0].message;
  }

  print.apply(null, [symbols.error, ...args]);
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

const makeRange = (start = 0, end = 0) => {
  const result = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }

  return result;
};

const parseTimeStrToMS = time => {
  const tmp = time.match(/(\d+)([h|m|s|ms]{1,2})/);
  const num = parseInt(tmp[1], 10);
  const unit = tmp[2];

  switch (unit) {
    case 'h':
      return num * 60 * 60 * 1000;
    case 'm':
      return num * 60 * 1000;
    case 's':
      return num * 1000;
    case 'ms':
    default:
      return num;
  }
};

/**
 * sort number
 * @param {name} x
 * @param {name} y
 */
const chainSortHandler = (xName, yName) => {
  // make default chain the first in order
  if (xName === DEFAULT_CHAIN_NAME) {
    return -1;
  }

  if (yName === DEFAULT_CHAIN_NAME) {
    return 1;
  }

  if (xName > yName) {
    return 1;
  }
  if (xName < yName) {
    return -1;
  }

  return 0;
};

const strEqual = (strA = '', strB = '') => strA.toUpperCase() === strB.toUpperCase();

const fetchAssetRace = async urlPath => {
  const tasks = MIRRORS.map(mirror => axios.get(url.resolve(mirror, urlPath)));
  const resp = await Promise.race(tasks);

  debug('fetchAssetRace.config', resp.config);
  return resp.data || [];
};

const fetchAsset = async assetPath => fetchAssetRace(assetPath);

module.exports = {
  chainSortHandler,
  fetchAsset,
  getPort,
  getFreePort,
  makeRange,
  md5,
  parseTimeStrToMS,
  prettyStringify,
  prettyTime,
  print,
  printLogo,
  printCurrentChain,
  printError,
  printInfo,
  printSuccess,
  printWarning,
  strEqual,
  sleep,
};
