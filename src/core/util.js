const path = require('path');
const fs = require('fs');
const os = require('os');
const axios = require('axios');
const crypto = require('crypto');
const get = require('lodash/get');
const figlet = require('figlet');
const shell = require('shelljs');
const chalk = require('chalk');
const url = require('url');
const getos = require('getos');
const tar = require('tar');
const getPort = require('get-port');
const prettyMilliseconds = require('pretty-ms');
const moment = require('moment');
const rc = require('rc');

const { symbols, hr } = require('./ui');
const { MIRRORS, REQUIRED_DIRS, ASSETS_PATH, SHIFT_WIDTH } = require('../constant');
const debug = require('./debug')('util');

/**
 * return json string with indent
 * @param {object} json object
 * @returns {string} stringified json
 */
function prettyStringify(json, { replacer = null, space = 4 } = {}) {
  return JSON.stringify(json, replacer, space);
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

const trim = str => {
  if (typeof str === 'string') {
    return str.trim();
  }

  return str;
};

/**
 * Write log to file
 * @param {array} args
 */
const logError = (...args) => {
  const content = args.map(item => (item instanceof Error ? item.stack : item)).join(os.EOL);
  if (!fs.existsSync(REQUIRED_DIRS.logs)) {
    fs.mkdirSync(REQUIRED_DIRS.logs, { recursive: true });
  }

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
  logError(...args);
  if (args.length && args[0] instanceof Error) {
    args[0] = args[0].message;
  }

  print.apply(null, [symbols.error, ...args]);
}

/**
 * Check if the port is a free port, if it's available return it, or return -1
 * @param {*} port
 */
async function checkPort({ host = '127.0.0.1', port }) {
  const p = +port;
  const tmp = await getPort({ host, port: p });
  if (+tmp === p) {
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
    const tmp = await checkPort({ port }); // eslint-disable-line
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

  return checkPort({ port });
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

const fetchReleaseAssetsInfo = async platform => {
  const data = await fetchAsset(ASSETS_PATH.VERSIONS);
  const result = [];
  if (Array.isArray(data)) {
    data.forEach(({ version, assets }) => {
      const tmp = { version, assets: [] };
      result.push(tmp);
      assets.forEach(({ name }) => {
        const index = name.indexOf(`_${platform}_`);
        if (index > 0) {
          tmp.assets.push(name.substring(0, index));
        }
      });
    });
  }

  return result;
};

function getPackageConfig(filePath) {
  const packageJSONPath = path.join(filePath, 'package.json');
  if (!fs.existsSync(packageJSONPath)) {
    throw new Error(`package.json not found in starter directory ${filePath}`);
  }

  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath).toString());
  return packageJSON;
}

const downloadPackageFromNPM = async (name, dest, registry = '') => {
  fs.mkdirSync(dest, { recursive: true });
  debug('starter directory:', dest);

  printInfo('Downloading package...');
  let packCommand = `npm pack ${name} --color`;
  if (name) {
    packCommand = `${packCommand} --registry=${registry}`;
  }

  const { code, stdout, stderr } = shell.exec(packCommand, {
    silent: true,
    cwd: dest,
  });

  if (code !== 0) {
    throw new Error(stderr);
  }

  const packageName = stdout.trim();
  await tar.x({ file: path.join(dest, packageName), C: dest, strip: 1 });

  return dest;
};

function getPlatform() {
  return new Promise((resolve, reject) => {
    const platform = process.env.FORGE_CLI_PLATFORM;
    if (platform && ['darwin', 'centos'].includes(platform)) {
      shell.echo(
        `${symbols.info} ${chalk.yellow(
          `Using custom platform: ${process.env.FORGE_CLI_PLATFORM}`
        )}`
      );
      resolve(platform);
      return;
    }

    getos((err, info) => {
      if (err) {
        return reject(err);
      }

      if (info.os === 'darwin') {
        return resolve(info.os);
      }

      if (info.os === 'linux') {
        return resolve('centos');
      }

      debug(`${info.os} is not supported by forge currently`);
      return resolve(info.os);
    });
  });
}

function highlightOfList(func, value, leftPad = SHIFT_WIDTH) {
  print(`${func() ? chalk.cyan(`->${leftPad}${value}`) : `  ${leftPad}${value}`}`);
}

function escapseHomeDir(homeDir = '') {
  if (homeDir[0] === '~') {
    return path.join(os.homedir(), homeDir.substring(1));
  }

  return homeDir;
}

function getNPMConfig(key) {
  const conf = rc('npm');
  return get(conf, key);
}

const waitUntilTruthy = (handler = () => true, timeout = 30000, message = '') =>
  // eslint-disable-next-line
  new Promise(async (resolve, reject) => {
    if (await handler()) {
      return resolve(true);
    }

    let timeElapsed = 0;
    const interval = 800;
    // eslint-disable-next-line
    const timer = setInterval(async () => {
      if (await handler()) {
        clearInterval(timer);
        return resolve(true);
      }

      if (timeElapsed > timeout) {
        clearInterval(timer);
        reject(new Error(message || `timeout for ${timeout / 1000} seconds`));
      }

      timeElapsed += interval;
    }, interval);
  });

module.exports = {
  chainSortHandler,
  checkPort,
  escapseHomeDir,
  downloadPackageFromNPM,
  fetchAsset,
  fetchReleaseAssetsInfo,
  getNPMConfig,
  getPlatform,
  getPort,
  getPackageConfig,
  getFreePort,
  makeRange,
  md5,
  highlightOfList,
  logError,
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
  trim,
  waitUntilTruthy,
};
