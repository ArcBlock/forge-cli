const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const fuzzy = require('fuzzy');
const inquirer = require('inquirer');
const shell = require('shelljs');
const GraphQLClient = require('@arcblock/graphql-client');
const { webUrl } = require('core/env');
const debug = require('core/debug')('create');
const { isDirectory, isFile } = require('core/forge-fs');
const { symbols, hr } = require('core/ui');
const { printError, printSuccess, printInfo } = require('core/util');
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const findTemplates = baseDir => {
  const templates = fs
    .readdirSync(baseDir)
    .filter(
      x =>
        /forge-[-a-zA-Z0-9_]+-starter/.test(x) &&
        isDirectory(path.join(baseDir, x)) &&
        isFile(path.join(baseDir, x, 'starter.config.js'))
    )
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
debug('application defaults', defaults);

const questions = [
  {
    type: 'autocomplete',
    name: 'template',
    message: 'Select a starter template:',
    default: defaults.template,
    source: (_, inp) => {
      const input = inp || '';
      return new Promise(resolve => {
        const result = fuzzy.filter(input, Object.keys(templates));
        resolve(result.map(item => item.original));
      });
    },
  },
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

function getStarter(starterDir) {
  let configFilePath = path.join(starterDir, './starter.config.js');

  // for compatible with old starter
  if (!fs.existsSync(configFilePath)) {
    const packageJSONPath = path.join(starter, 'package.json');
    if (!fs.existsSync(packageJSONPath)) {
      throw new Error('no package.json file in starter');
    }

    const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath).toString());
    configFilePath = path.resolve(starterDir, packageJSON.main);
    if (!fs.existsSync(configFilePath)) {
      throw new Error(`entry file: "${configFilePath}" is no exists`);
    }
  }

  // eslint-disable-next-line
  const starter = require(configFilePath);

  return starter;
}

async function main({ args: [_target], opts: { yes } }) {
  try {
    if (Object.keys(templates).length === 0) {
      printError('No starter project templates found');
      printInfo(`Run ${chalk.cyan('npm install -g forge-react-starter')} to install react-starter`);
      process.exit(1);
    }

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
    const { template, chainHost } = yes ? defaults : await inquirer.prompt(questions);
    const client = new GraphQLClient({ endpoint: chainHost });
    const { info } = await client.getChainInfo();
    const chainId = info.network;
    const starterDir = templates[template];
    const starter = getStarter(starterDir);
    const config = { starterDir, targetDir, template, chainHost, chainId };
    if (yes || (Array.isArray(starter.questions) && starter.questions.length === 0)) {
      Object.assign(config, defaults, starter.defaults || {});
    } else {
      const answers = await inquirer.prompt(starter.questions);
      Object.assign(config, answers);
    }

    // Sync files
    printInfo('application config', config);
    printInfo(`project folder: ${targetDir}`);
    printInfo('creating project files...');
    shell.echo(hr);
    if (!fs.existsSync(targetDir)) {
      shell.mkdir(targetDir);
    }

    // compatible code
    if (typeof starter.onCopyFiles === 'function') {
      starter.onCopyFiles(targetDir);
    } else {
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
    printSuccess('application created successfully...');
    if (typeof starter.onComplete === 'function') {
      await starter.onComplete(Object.assign({ client, symbols }, config));
    }
    shell.echo(hr);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

exports.run = main;
exports.execute = main;
