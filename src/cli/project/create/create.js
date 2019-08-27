const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const fsExtra = require('fs-extra');
const fuzzy = require('fuzzy');
const path = require('path');
const inquirer = require('inquirer');
const os = require('os');
const semver = require('semver');
const shell = require('shelljs');
const GraphQLClient = require('@arcblock/graphql-client');
const tar = require('tar'); // eslint-disable-line
const { webUrl } = require('core/env');
const debug = require('core/debug')('project:create');
const { isDirectory } = require('core/forge-fs');
const { symbols, hr, wrapSpinner } = require('core/ui');
const {
  prettyStringify,
  print,
  printError,
  printSuccess,
  printInfo,
  printWarning,
} = require('core/util');
const { REMOTE_STARTER_URL } = require('../../../constant');
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const STARTER_DIR = path.join(os.homedir(), '.forge_starter');

const yarnCheckResult = shell.which('yarn') || {};
const pm = yarnCheckResult.stdout ? yarnCheckResult.stdout : 'npm';
debug('pm:', pm);

const defaults = {
  chainHost: `${webUrl()}/api`,
};
debug('application defaults:', defaults);

const questions = [
  {
    type: 'text',
    name: 'chainHost',
    message: 'Running chain node graphql endpoint:',
    default: defaults.chainHost,
    validate: input => {
      if (!input) return 'Chain node endpoint should not be empty';
      return true;
    },
  },
];

function createDirectoryContents({ fromPath, toPath, blacklist, symbolicLinks }) {
  const filesToCreate = fs.readdirSync(fromPath).filter(x => blacklist.every(s => x !== s));

  filesToCreate.forEach(file => {
    const origFilePath = `${fromPath}/${file}`;

    // get stats about the current file
    const stats = fs.lstatSync(origFilePath);
    const targetPath = `${toPath}/${file}`;

    if (stats.isFile()) {
      try {
        const contents = fs.readFileSync(origFilePath);
        fs.writeFileSync(targetPath, contents);
        printSuccess(`created file ${targetPath}`);
      } catch (err) {
        printError(`error sync file ${targetPath}`);
        debug.error(err);
        process.exit(1);
      }
    } else if (stats.isSymbolicLink()) {
      symbolicLinks.push([origFilePath, targetPath]);
    } else if (stats.isDirectory()) {
      try {
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath);
        }
        createDirectoryContents({
          fromPath: `${fromPath}/${file}`,
          toPath: `${toPath}/${file}`,
          blacklist,
          symbolicLinks,
        });
        printSuccess(`created dir ${targetPath}`);
      } catch (err) {
        printError(`error sync file ${targetPath}`);
        debug.error(err);
        process.exit(1);
      }
    }
  });
}

function copyFiles({ starterDir, blacklist, targetDir }) {
  const excludes = [
    '.git',
    '.cache',
    '.vscode',
    '.netlify',
    '.next',
    '.env',
    'cache',
    'tmp',
    'node_modules',
    'dist',
    'build',
  ].concat(blacklist || []);
  printInfo('exclude files:', excludes);
  const symbolicLinks = [];
  createDirectoryContents({
    fromPath: starterDir,
    toPath: targetDir,
    blacklist: excludes,
    symbolicLinks,
  });

  symbolicLinks.forEach(([origFilePath, targetPath]) => {
    try {
      const sourcePathReal = fs.realpathSync(origFilePath);
      const fromRootReal = fs.realpathSync(starterDir);
      const sourcePath = path.join(targetDir, sourcePathReal.replace(fromRootReal, ''));
      fs.symlinkSync(sourcePath, targetPath);
      printSuccess(`symbolic file ${targetPath}`);
    } catch (err) {
      printError(`error sync file ${targetPath}`);
      debug.error(err);
      process.exit(1);
    }
  });
}

/**
 *
 * @param {string} src source directory
 * @param {string[]} files files/directories in source directory
 * @param {string} dest dest directory
 */
async function copyTemplateFiles(src, files, dest) {
  files.forEach(file => {
    fsExtra.copySync(path.resolve(src, file), dest);
  });
}

function getStarter(starterDir, starterEntryPath) {
  let configFilePath = path.join(starterDir, './starter.config.js');

  // for compatible with old starter
  if (!fs.existsSync(configFilePath)) {
    configFilePath = path.resolve(starterDir, starterEntryPath);
    if (!fs.existsSync(configFilePath)) {
      throw new Error(`starter config file: "${configFilePath}" does not exist`);
    }
  }

  // eslint-disable-next-line
  const starter = require(configFilePath);

  return starter;
}

function getStarterPackageConfig(starterPath) {
  const packageJSONPath = path.join(starterPath, 'package.json');
  if (!fs.existsSync(packageJSONPath)) {
    throw new Error(`package.json not found in starter directory ${starterPath}`);
  }

  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath).toString());
  return packageJSON;
}

function installNodeDependencies(dir, registry) {
  printInfo('Installing dependencies...');

  let command = `${pm} install --color`;
  if (registry) {
    command = `${command} --registry=${registry}`;
    printInfo(`Using registry: ${chalk.cyan(registry)}`);
  }

  return shell.exec(command, { cwd: dir });
}

async function downloadStarter(template, dest, registry = '') {
  fs.mkdirSync(dest, { recursive: true });
  debug('starter directory:', dest);

  printInfo('Downloading package...');
  let packCommand = `npm pack ${template} --color`;
  if (template) {
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
}

async function getTargetDir(targetDirectory) {
  let result = targetDirectory;
  if (fs.existsSync(result) && fs.readdirSync(result).length) {
    printWarning(`Target directory ${result} already exists and not empty, please choose other:`);
    result = '';
  }
  if (!result) {
    const { targetDir } = await inquirer.prompt({
      type: 'text',
      name: 'targetDir',
      message: 'Please input target directory:',
      validate: input => {
        if (!input) return 'Target directory should not be empty';

        const dest = path.resolve(input);
        if (isDirectory(dest) && fs.readdirSync(dest).length > 0) {
          return `Target folder ${chalk.cyan(path.basename(dest))} is not empty`;
        }

        return true;
      },
    });

    result = targetDir;
  }

  return path.resolve(result);
}

async function getStarterName(starter, starters) {
  let result = starter;
  if (result && !starters[result]) {
    printError('Please select a valid starter template.');
    result = '';
  }

  if (!result) {
    const templates = Object.keys(starters);
    const { template } = await inquirer.prompt([
      {
        type: 'autocomplete',
        name: 'template',
        message: 'Select a starter template:',
        default: defaults.template,
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

async function checkStarterVersion(starterName, localVersion, remoteVersion) {
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

function getLocalStarterDir(starterName) {
  if (!starterName) {
    return '';
  }
  const dest = path.join(STARTER_DIR, starterName);

  return dest;
}

async function getAllRemoteStarters(url) {
  try {
    const { data } = await axios.get(url);
    return data;
  } catch (error) {
    debug(error);
    return {};
  }
}

async function getStarterConfig({ starters, inputStarterName, inputStarterDir, registry }) {
  let starterPackageConfig = null;
  let starterDir = '';

  if (fs.existsSync(inputStarterDir)) {
    starterDir = inputStarterDir;
    starterPackageConfig = getStarterPackageConfig(starterDir);
  } else {
    const sName = await getStarterName(inputStarterName, starters);
    starterDir = getLocalStarterDir(sName, registry);

    if (fs.existsSync(starterDir)) {
      starterPackageConfig = getStarterPackageConfig(starterDir);
      const { name, version } = starterPackageConfig;
      if (await checkStarterVersion(name, version, starters[name].version)) {
        fsExtra.removeSync(starterDir);
        await downloadStarter(name, starterDir, registry);
      }
    } else {
      starterDir = await downloadStarter(sName, starterDir, registry);
      starterPackageConfig = getStarterPackageConfig(starterDir);
    }
  }

  return { starterDir, starterPackageConfig };
}

async function main({
  args: [inputStarterName = ''],
  opts: { yes, target = '', starterDir: inputStarterDir, npmRegistry: registry },
}) {
  try {
    const starters = await wrapSpinner(
      'Fetching starters information...',
      getAllRemoteStarters,
      REMOTE_STARTER_URL
    );

    const templates = Object.keys(starters);
    if (templates.length === 0) {
      printError('No available starters, please check your network.');
      process.exit(1);
    }

    const targetDir = await getTargetDir(target);
    debug('dest:', targetDir);

    const { starterDir, starterPackageConfig } = await getStarterConfig({
      starters,
      inputStarterName,
      inputStarterDir,
      registry,
    });

    installNodeDependencies(starterDir, registry);
    debug('Starter dependencies installed...');

    const starter = getStarter(starterDir, starterPackageConfig.main);

    const { chainHost } = yes ? defaults : await inquirer.prompt(questions);
    const client = new GraphQLClient({ endpoint: chainHost });
    const { info } = await client.getChainInfo();
    const chainId = info.network;

    // todo: first step, check requirements, like python, node...

    const config = {
      starterDir,
      targetDir,
      template: starterPackageConfig.name,
      chainHost,
      chainId,
    };

    if (yes || (Array.isArray(starter.questions) && starter.questions.length === 0)) {
      Object.assign(config, defaults, starter.defaults || {});
    } else {
      const answers = await inquirer.prompt(starter.questions);
      Object.assign(config, answers);
    }

    // Sync files
    printInfo('application config:');
    print(prettyStringify(config));
    printInfo(`project folder: ${targetDir}`);
    printInfo('creating project files...');

    shell.echo(hr);

    if (!fs.existsSync(targetDir)) {
      shell.mkdir(targetDir);
    }

    if (starterPackageConfig.files) {
      copyTemplateFiles(starterDir, starterPackageConfig.files, targetDir);
      debug('template file copied');
    } else {
      // Compatible code
      copyFiles({ starterDir, blacklist: starter.blacklist, targetDir });
    }

    shell.echo(hr);

    // Create configuration files, etc
    if (typeof starter.onConfigured === 'function') {
      await starter.onConfigured(Object.assign({ client, symbols }, config));
    }

    // Install dependencies, etc
    if (typeof starter.onCreated === 'function') {
      await starter.onCreated(Object.assign({ client, symbols }, config));
    }

    // Prompt getting started command
    printSuccess('Application created successfully...');
    if (typeof starter.onComplete === 'function') {
      await starter.onComplete(Object.assign({ client, symbols }, config));
    }
    shell.echo(hr);
  } catch (err) {
    printError(err);
  }
}

exports.run = main;
exports.execute = main;
