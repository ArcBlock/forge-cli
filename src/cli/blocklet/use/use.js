const chalk = require('chalk');
const fs = require('fs');
const fsExtra = require('fs-extra');
const fuzzy = require('fuzzy');
const inquirer = require('inquirer');
const path = require('path');
const semver = require('semver');
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const {
  downloadPackageFromNPM,
  getPackageConfig,
  printError,
  printInfo,
  printWarning,
} = require('core/util');
const { isDirectory, isEmptyDirectory } = require('core/forge-fs');

const { BLOCKLET_DIR } = require('../../../constant');
const { getBlocklets } = require('../lib');

const BLOCKLET_CONFIG_FILEPATH = 'blocklet.json';

function getLocalBlocklet(starterName) {
  if (!starterName) {
    return '';
  }

  const dest = path.join(BLOCKLET_DIR, starterName);

  return dest;
}

const promptTargetDirectory = async (checkEmpty = true) => {
  const { targetDir } = await inquirer.prompt({
    type: 'text',
    name: 'targetDir',
    message: 'Where do you want to put the generated project/dApp?',
    validate: input => {
      if (!input) return 'Target directory should not be empty';

      const dest = path.resolve(input);
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
        return true;
      }

      if (!isDirectory(dest)) {
        return `Target ${chalk(dest)} is a file`;
      }

      if (checkEmpty && !isEmptyDirectory(dest)) {
        return `Target folder ${chalk.cyan(dest)} is not empty`;
      }

      return true;
    },
  });

  return targetDir;
};

async function getTargetDir(targetDirectory, checkEmpty = true) {
  let result = targetDirectory;
  if (!result) {
    result = process.cwd();
  }

  if (fs.existsSync(result)) {
    if (!isDirectory(result)) {
      printWarning(`Target ${chalk.cyan(result)} is a file, please input a directory:`);
      result = await promptTargetDirectory();
    } else if (checkEmpty && !isEmptyDirectory(result)) {
      printWarning(`Target directory ${chalk.cyan(result)} is not empty, please choose another:`);
      result = await promptTargetDirectory();
    }
  } else {
    fs.mkdirSync(result);
  }

  return path.resolve(result);
}

async function readUserBlockletName(name, blockletsMap) {
  let result = name;
  if (result && !blockletsMap[result]) {
    printError(`There is no ${result} blocklet, please select a valid blocklet:`);
    result = '';
  }

  if (!result) {
    const tmp = Object.keys(blockletsMap);
    const { blocklet } = await inquirer.prompt([
      {
        type: 'autocomplete',
        name: 'blocklet',
        message: 'Select a blocklet:',
        source: (_, inp) => {
          const input = inp || '';
          return new Promise(resolve => {
            const r = fuzzy.filter(input, tmp);
            resolve(r.map(item => item.original));
          });
        },
      },
    ]);

    result = blocklet;
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

const fetchRemoteBlocklet = async ({ name, blocklets, registry, verify }) => {
  const blockletsMap = blocklets.reduce((acc, item) => {
    acc[item.name] = item;
    return acc;
  }, {});

  const blockname = await readUserBlockletName(name, blockletsMap);
  const blockletDir = getLocalBlocklet(blockname, registry);

  if (fs.existsSync(blockletDir)) {
    const packageConfig = getPackageConfig(blockletDir);
    const { version } = packageConfig;
    if (await checkBlockletUpdate(blockname, version, blockletsMap[blockname].version)) {
      fsExtra.removeSync(blockletDir);
      await downloadPackageFromNPM({
        name: blockname,
        dest: blockletDir,
        registry,
        verify: false,
      });
    }
  } else {
    await downloadPackageFromNPM({
      name: blockname,
      dest: blockletDir,
      registry,
      verify,
    });
  }

  return blockletDir;
};

/**
 * Load handler by blocklet group name
 * @param {string} group - blocklet group name
 * @return {BaseHandler} handler
 */
const getHandlerByBlockletGroup = group => {
  const filePath = path.join(__dirname, '..', 'lib', 'handlers', `${group}.js`);
  if (!group || !fs.existsSync(filePath)) {
    printInfo('Use default group handler.');
    return require(path.join(__dirname, '..', 'lib', 'base-handler.js')); // eslint-disable-line
  }

  return require(filePath); // eslint-disable-line
};

/**
 * Get blocklet information
 *
 * @param {Object} options
 * @param {string} options.name - blocklet name, if localBlockDir is empty, it will use `name` to fetch blocklet from remote
 * @param {string} options.localBlockletDir - If localblockDir is not empty, will load from local blocklet
 * @returns {Object} info.blockletDir - blocklet directory
 */
async function loadBlocklet({ name = '', localBlockletDir, blocklets, registry, verify }) {
  let blockletDir = '';

  if (localBlockletDir) {
    blockletDir = path.resolve(localBlockletDir);
  } else {
    blockletDir = await fetchRemoteBlocklet({ name, blocklets, registry, verify });
  }

  if (!fs.existsSync(blockletDir)) {
    throw new Error('load blocklet failed');
  }

  return blockletDir;
}

// Execute the cli silently.
function execute(data) {
  run(data);
}

// Run the cli interactively
async function run({
  args: [blockletName = ''],
  opts: { localBlocklet, target, blockletRegistry, verify },
}) {
  try {
    const blocklets = await getBlocklets(blockletRegistry);

    const blockletDir = await loadBlocklet({
      name: blockletName,
      localBlockletDir: localBlocklet,
      blocklets,
      verify,
    });

    const blockletConfig = JSON.parse(
      fs.readFileSync(path.join(blockletDir, BLOCKLET_CONFIG_FILEPATH)).toString()
    );

    const { composable = false } = blockletConfig;
    const checkEmptyDir = !composable;
    const targetDir = await getTargetDir(target, checkEmptyDir);
    const Handler = getHandlerByBlockletGroup(blockletConfig.group);
    const handler = new Handler({ blockletConfig, targetDir, blockletDir });

    await handler.verify();
    await handler.handle();
  } catch (error) {
    printError(error);
    process.exit(1);
  }
}

exports.run = run;
exports.execute = execute;
