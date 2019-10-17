const chalk = require('chalk');
const fs = require('fs');
const fuzzy = require('fuzzy');
const inquirer = require('inquirer');
const path = require('path');
const pickBy = require('lodash/pickBy');

const {
  logError,
  print,
  printError,
  printInfo,
  printSuccess,
  prettyStringify,
} = require('core/util');

const { BLOCKLET_GROUPS, BLOCKLET_COLORS } = require('../../../constant');

const COMMON_KEYS = ['name', 'description', 'version', 'author', 'keywords', 'repository'];

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const pickCommonFieldsInBlockletAndPackage = configs =>
  pickBy(configs, (value, key) => value !== undefined && COMMON_KEYS.includes(key));

const getPromptQuestions = defaults => {
  const questions = [
    {
      type: 'text',
      name: 'name',
      message: 'blocklet name:',
      default: defaults.name,
      validate: input => {
        // prettier-ignore
        if (!input || input.trim().length < 4) {
          return 'Name length should be more than 4 characters';
        }

        return true;
      },
    },
    {
      type: 'text',
      name: 'description',
      message: 'Please write concise description:',
      default: defaults.description || '',
    },
    {
      type: 'autocomplete',
      name: 'group',
      message: 'What\'s group of the blocklet?', // prettier-ignore
      default: defaults.group,
      source: (_, inp) => {
        const input = inp || '';
        return new Promise(resolve => {
          const result = fuzzy.filter(input, BLOCKLET_GROUPS);
          resolve(result.map(item => item.original));
        });
      },
    },
    {
      type: 'autocomplete',
      name: 'color',
      message: 'Choose a theme for your blocklet:',
      default: defaults.color,
      source: (_, inp) => {
        const input = inp || '';
        return new Promise(resolve => {
          const result = fuzzy.filter(input, BLOCKLET_COLORS);
          resolve(result.map(item => item.original));
        });
      },
    },
    {
      type: 'text',
      name: 'templates', // For array type parameter
      message: 'Blocklet templates folder:',
      default: defaults.templates,
      validate: input => {
        if (!input || !input.trim()) return 'folder name should not be empty';
        return true;
      },
    },
  ];

  return questions;
};

// Execute the cli silently.
async function execute({ blockletJSONPath, packageJSONPath, configs }) {
  print('\n');

  if (!fs.existsSync('blocklet.md')) {
    fs.writeFileSync('blocklet.md', `# ${configs.name}`);
    printSuccess(`Doc file ${chalk.cyan('blocklet.md')} was created`);
  }

  if (configs.templates && !fs.existsSync(configs.templates)) {
    fs.mkdirSync(configs.templates);
    printSuccess(`Templates dir ${chalk.cyan(configs.templates)} was created`);
  }

  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
    printSuccess(`Screenshots dir ${chalk.cyan('screenshots/')} was created`);
  }

  configs.keywords = configs.keywords || [];
  configs['install-scripts'] = configs['install-scripts'] || {
    'install-dependencies': "echo 'no dependencies scripts'", // eslint-disable-line
  };
  configs.hooks = configs.hooks || {
    'pre-copy': "echo 'no configure hooks'", // eslint-disable-line
    configure: "echo 'no configure hooks'", // eslint-disable-line
    'post-copy': "echo 'no post-copy hooks'", // eslint-disable-line
    'on-complete': "echo 'no on-complete hooks'", // eslint-disable-line
  };

  const defaultPackageJSON = {
    name: configs.name,
    keywords: [],
    version: '1.0.0',
    main: 'index.js',
    scripts: {
      test: 'echo "Error: no test specified" && exit 1',
    },
    author: '',
    license: 'ISC',
    description: configs.description,
  };
  const originalPackageJSON = fs.existsSync(packageJSONPath)
    ? JSON.parse(fs.readFileSync(packageJSONPath))
    : defaultPackageJSON;
  Object.assign(originalPackageJSON, pickCommonFieldsInBlockletAndPackage(configs));

  const blockletString = prettyStringify(configs, { space: 2 });
  fs.writeFileSync(blockletJSONPath, blockletString);
  printSuccess(`Wrote to ${blockletJSONPath}`);

  const packageString = prettyStringify(originalPackageJSON, { space: 2 });
  fs.writeFileSync(packageJSONPath, packageString);
  printSuccess(`Wrote to ${packageJSONPath}`);

  print('\nblocklet.json:');
  print(blockletString);
  print('\npackage.json:');
  print(packageString);
}

// Run the cli interactively
async function run({ opts: { defaults, yes } }) {
  const blockletJSONPath = path.join(process.cwd(), 'blocklet.json');
  const packageJSONPath = path.join(process.cwd(), 'package.json');
  let blockletJSON = {};
  let packageJSON = {};
  if (fs.existsSync(blockletJSONPath)) {
    try {
      blockletJSON = JSON.parse(fs.readFileSync(blockletJSONPath));
    } catch (error) {
      printError('read blocklet.json file failed.');
      printInfo('please check if blocklet.json is a valid json file.');
      logError(error);
      process.exit(1);
    }
  }

  if (fs.existsSync(packageJSONPath)) {
    try {
      packageJSON = JSON.parse(fs.readFileSync(packageJSONPath));
    } catch (error) {
      printError('read package.json file failed.');
      printInfo('please check if package.json is a valid json file.');
      logError(error);
      process.exit(1);
    }
  }

  print('This utility will walk you through create such files and folders(if not exists):');
  print('- blocklet.json');
  print('- blocklet.md');
  print('- package.json');
  print('- screenshots/');
  print('- <templates folder>/(upon your input)');
  print('\nIt only covers common items, if you want to check all items, please visit:');
  print('https://github.com/ArcBlock/blocklets#keyinfo-blockletjson\n');
  print('Press ^C to quit.');

  const mergedConfigs = Object.assign(
    {
      name: path.basename(process.cwd()),
      group: BLOCKLET_GROUPS[0],
      color: 'primary',
      templates: 'templates',
    },
    blockletJSON,
    pickCommonFieldsInBlockletAndPackage(packageJSON)
  );

  let answers = {};
  const questions = getPromptQuestions(mergedConfigs);
  if (defaults || yes) {
    answers = questions.reduce((acc, item) => {
      if (item.default) {
        acc[item.name] = item.default;
      }

      return acc;
    }, {});
  } else {
    answers = await inquirer.prompt(questions);
  }

  Object.assign(mergedConfigs, answers);

  await execute({ blockletJSONPath, packageJSONPath, configs: mergedConfigs });
}

exports.run = run;
exports.execute = execute;
