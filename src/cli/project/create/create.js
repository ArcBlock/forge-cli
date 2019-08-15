const chalk = require('chalk');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const os = require('os');
const shell = require('shelljs');
const GraphQLClient = require('@arcblock/graphql-client');
const tar = require('tar'); // eslint-disable-line
const { webUrl } = require('core/env');
const debug = require('core/debug')('create');
const { isDirectory, isFile } = require('core/forge-fs');
const { symbols, hr } = require('core/ui');
const { prettyStringify, print, printError, printSuccess, printInfo } = require('core/util');
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const STARTER_DIRECTORY = path.join(os.homedir(), '.forge_starter');

const findTemplates = baseDir => {
  const templates = fs
    .readdirSync(baseDir)
    .filter(x => {
      const templateDirectory = fs.realpathSync(path.join(baseDir, x));
      return (
        /forge-[-a-zA-Z0-9_]+-starter/.test(x) &&
        isDirectory(templateDirectory) &&
        isFile(path.join(templateDirectory, 'starter.config.js'))
      );
    })
    .reduce((obj, x) => {
      obj[x] = path.join(baseDir, x);
      return obj;
    }, {});

  return templates;
};

const findBaseDirs = () => {
  const baseDirs = [];

  // npm packages
  const { stdout: npmGlobal } = shell.exec('npm prefix -g', { silent: true });
  baseDirs.push(path.join(npmGlobal.trim(), 'lib/node_modules'));

  debug('baseDirs', baseDirs);

  // yarn packages and links
  const { stdout: yarn = '' } = shell.which('yarn', { silent: true }) || { stdout: '' };
  if (yarn.trim()) {
    const { stdout: yarnBase } = shell.exec('yarn global dir', { silent: true });
    baseDirs.push(path.join(yarnBase.trim(), 'node_modules'));
    baseDirs.push(path.join(path.dirname(yarnBase.trim()), 'link'));
  }

  return baseDirs.filter(x => isDirectory(x));
};

// get starter templates
const templates = findBaseDirs()
  .map(x => findTemplates(x))
  .reduce((obj, x) => Object.assign(obj, x), {});
debug('project templates', templates);

const defaults = {
  template: Object.keys(templates)[0],
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
      throw new Error(`entry file: "${configFilePath}" is no exists`);
    }
  }

  // eslint-disable-next-line
  const starter = require(configFilePath);

  return starter;
}

function getStartPackageConfig(starterPath) {
  const packageJSONPath = path.join(starterPath, 'package.json');
  if (!fs.existsSync(packageJSONPath)) {
    throw new Error('no package.json file in starter');
  }

  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath).toString());
  return packageJSON;
}

async function downloadStarter(startName) {
  if (!fs.existsSync(STARTER_DIRECTORY)) {
    fs.mkdirSync(STARTER_DIRECTORY);
  }

  const dest = path.join(os.tmpdir(), `forge-starter${Date.now()}`);
  fs.mkdirSync(dest);
  const { code, stdout, stderr } = shell.exec(`cd ${dest} && npm pack ${startName}`);
  if (code !== 0) {
    throw new Error(stderr);
  }

  const packageName = stdout.trim();
  await tar.x({ file: path.join(dest, packageName), C: dest });
  const starterPath = path.join(dest, 'package');
  shell.exec(`cd ${starterPath} && yarn`);

  return starterPath;
}

function clearStarter(starterDir) {
  fsExtra.removeSync(starterDir);
  debug('starter cleared...');
}

async function main({ args: [_target], opts: { yes } }) {
  let starterDir = '';

  try {
    // if (Object.keys(templates).length === 0) {
    //   printError('No starter project templates found');
    //   printInfo(`Run ${chalk.cyan('npm install -g forge-react-starter')} to install react-starter`);
    //   process.exit(1);
    // }

    if (!_target) {
      printError('Please specify a folder for creating the new application');
      printInfo(`You can try ${chalk.cyan('forge create-project hello-forge')}`);
      process.exit(1);
    }

    // fix: is absolute path
    const target = _target.startsWith('/') ? _target : path.join(process.cwd(), _target);
    // Determine targetDir
    const targetDir = path.resolve(target);
    if (isDirectory(targetDir) && fs.readdirSync(targetDir).length > 0) {
      printError(`target folder ${target} already exist and not empty`);
      process.exit(1);
    }

    // fix: check forge is running, or better error handling
    // Collecting starter config
    const { starterName } = await inquirer.prompt([
      {
        type: 'text',
        name: 'starterName',
        message: 'Input starter name:',
        validate: input => {
          if (!input) return 'starterName should not be empty';
          return true;
        },
      },
    ]);

    starterDir = await downloadStarter(starterName);
    const starterPackageConfig = getStartPackageConfig(starterDir);
    const starter = getStarter(starterDir, starterPackageConfig.main);

    const { chainHost } = yes ? defaults : await inquirer.prompt(questions);
    const client = new GraphQLClient({ endpoint: chainHost });
    const { info } = await client.getChainInfo();
    const chainId = info.network;

    // 1. check requirements
    const config = { starterDir, targetDir, template: starterName, chainHost, chainId };
    if (yes || (Array.isArray(starter.questions) && starter.questions.length === 0)) {
      Object.assign(config, defaults, starter.defaults || {});
    } else {
      const answers = await inquirer.prompt(starter.questions);
      Object.assign(config, answers);
    }

    // sync files
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
      // compatible code
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

    clearStarter(starterDir);

    // Prompt getting started command
    printSuccess('Application created successfully...');
    if (typeof starter.onComplete === 'function') {
      await starter.onComplete(Object.assign({ client, symbols }, config));
    }
    shell.echo(hr);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  } finally {
    if (fs.existsSync(starterDir)) {
      clearStarter(starterDir);
    }
  }
}

exports.run = main;
exports.execute = main;
