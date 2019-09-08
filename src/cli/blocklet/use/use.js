const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const fuzzy = require('fuzzy');
const semver = require('semver');
const inquirer = require('inquirer');
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const { wrapSpinner } = require('core/ui');
const debug = require('core/debug');
const { downloadPackageFromNPM, getPackageConfig, printError } = require('core/util');

const { BLOCKLET_DIR, REMOTE_BOCKLET_URL } = require('../../../constant');

const BLOCKLET_CONFIG_FILEPATH = path.join('blocklet', 'blocklet.json');
const BLOCKLET_GROUPS = ['starter', 'dapp', 'contract'];

async function getBlocklets(url) {
  try {
    const { data } = await axios.get(url);
    return data;
  } catch (error) {
    debug(error);
    return {};
  }
}

function getLocalBlocklet(starterName) {
  if (!starterName) {
    return '';
  }

  const dest = path.join(BLOCKLET_DIR, starterName);

  return dest;
}

async function readUserBlockletName(name, blocklets) {
  let result = name;
  if (result && !blocklets[result]) {
    printError('Please select a valid starter template.');
    result = '';
  }

  if (!result) {
    const templates = Object.keys(blocklets);
    const { template } = await inquirer.prompt([
      {
        type: 'autocomplete',
        name: 'template',
        message: 'Select a starter template:',
        source: (_, inp) => {
          const input = inp || '';
          return new Promise(resolve => {
            const r = fuzzy.filter(input, templates);
            resolve(r.map(item => item.original));
          });
        },
      },
    ]);

    result = template;
  }

  return result;
}

async function checkBlockletUpdate(starterName, localVersion, remoteVersion) {
  if (semver.lt(localVersion, remoteVersion)) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        default: false,
        message: chalk.yellow(
          `${starterName}: New version ${remoteVersion} is available, upgrade?`
        ),
      },
    ]);

    return confirm;
  }

  return false;
}

const fetchRemoteBlocklet = async (name, blocklets, registry) => {
  const userBlockname = await readUserBlockletName(name, blocklets);
  const blockletDir = getLocalBlocklet(userBlockname, registry);

  if (fs.existsSync(blockletDir)) {
    const packageConfig = getPackageConfig(blockletDir);
    const { version } = packageConfig;
    if (await checkBlockletUpdate(name, version, blocklets[name].version)) {
      fsExtra.removeSync(blockletDir);
      await downloadPackageFromNPM(name, blockletDir, registry);
    }
  } else {
    await downloadPackageFromNPM(name, blockletDir, registry);
  }

  return blockletDir;
};

/**
 * Load handler by blocklet group name
 * @param {string} group - blocklet group name
 */
const loadHandlerByBlockletGroup = group => {
  const filePath = path.join(__dirname, '..', 'lib', 'handlers', `${group}.js`);
  if (!group || !fs.existsSync(filePath)) {
    throw new Error(`group ${group} is invalid`);
  }

  return require(filePath); // eslint-disable-line
};

/**
 * Get blocklet information
 *
 * @param {Object} options
 * @param {string} options.name - blocklet name, if localBlockDir is empty, it will use `name` to fetch blocklet from remote
 * @param {string} options.localBlockletDir - If localblockDir is not empty, will load from local blocklet
 * @returns {Object} info - blocklet information
 * @returns {Object} info.blockletDir - blocklet directory
 */
async function loadBlocklet({ name = '', localBlockletDir, blocklets, registry }) {
  let blockletDir = '';

  if (localBlockletDir) {
    blockletDir = path.resolve(localBlockletDir);
  } else {
    // download from remote
    blockletDir = await fetchRemoteBlocklet(name, blocklets, registry);
  }

  if (!fs.existsSync(blockletDir)) {
    throw new Error('load blocklet failed');
  }

  return blockletDir;
}

const verifyBlocklet = blockletDir => {
  const blockletJSONPath = path.join(blockletDir, BLOCKLET_CONFIG_FILEPATH);

  if (!fs.existsSync(blockletJSONPath)) {
    throw new Error(`${BLOCKLET_CONFIG_FILEPATH} file not found`);
  }

  const blockletConfig = JSON.parse(fs.readFileSync(blockletJSONPath));

  if (!BLOCKLET_GROUPS.includes(blockletConfig.group)) {
    throw new Error('invalid group');
  }

  // TODO: verify other requirements
};

// Execute the cli silently.
function execute(data) {
  run(data);
}

// Run the cli interactively
async function run({ args: [blockletName = ''], opts: { localBlocklet } }) {
  let blocklets = await wrapSpinner(
    'Fetching blocklets information...',
    getBlocklets,
    REMOTE_BOCKLET_URL
  );
  blocklets = blocklets.reduce((acc, item) => {
    acc[item.name] = item;
    return acc;
  }, {});

  const blockletDir = await loadBlocklet({
    name: blockletName,
    localBlockletDir: localBlocklet,
    blocklets,
  });

  verifyBlocklet(blockletDir);

  const blockletConfig = JSON.parse(
    fs.readFileSync(path.join(blockletDir, BLOCKLET_CONFIG_FILEPATH)).toString()
  );

  const handler = loadHandlerByBlockletGroup(blockletConfig.group);

  await handler.verify(blockletConfig, { cwd: blockletDir });
  await handler.run(blockletConfig, { cwd: blockletDir });
}

exports.run = run;
exports.execute = execute;
