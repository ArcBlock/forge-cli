const chalk = require('chalk');
const get = require('lodash/get');
const isEmpty = require('lodash/isEmpty');
const fs = require('fs');
const semver = require('semver');
const inquirer = require('inquirer');
const { Client } = require('pg');
const findProcess = require('find-process');

const debug = require('core/debug')('swap');
const { getReleaseBinPath, getForgeSwapConfigFile } = require('core/forge-fs');
const { getForgeSwapProcess } = require('core/forge-process');
const { printError, printInfo, printWarning, sleep, waitUntilTruthy } = require('core/util');
const { makeForgeSwapRunCommand, makeNativeCommandRunner } = require('core/libs/common');
const { getGlobalForgeVersion } = require('core/forge-fs');
const { getSpinner } = require('core/ui');

const { SEMVER_REGEX } = require('../../../constant');
const { configSwap, readForgeSwapConfig } = require('./config');

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const ensurePostgres = async dbConfig => {
  const client = new Client({
    user: dbConfig.username,
    host: dbConfig.hostname,
    database: dbConfig.database,
    password: dbConfig.password,
  });

  try {
    client.connect();
    await client.query(
      `SELECT EXISTS(SELECT datname FROM pg_catalog.pg_database WHERE datname = '${dbConfig.database}');`
    );
  } catch (error) {
    printError('connect database failed');
    printError(error);
  } finally {
    client.end();
    debug('ensureDatabaseRequirement', 'postgres disconnected');
  }
};

const ensureChains = async (chainsConfig = []) => {
  const chains = [
    { name: 'asset', config: chainsConfig.asset },
    { name: 'application', config: chainsConfig.application },
  ];

  chains.forEach(async ({ name, config }) => {
    if (isEmpty(config)) {
      throw new Error(`Chain ${chalk.cyan(name)} config is empty`);
    }
  });
};

const DB_HANDLER = {
  postgres: ensurePostgres,
};

/**
 * Check
 * @param {object} dbConfig database configuration
 */
const ensureDatabaseRequirement = async dbConfig => {
  const dbType = get(dbConfig, 'type', '');
  const handler = DB_HANDLER[dbType.toLowerCase()];
  if (!handler) {
    throw new Error('Do not support database type:', dbType);
  }

  await handler(dbConfig);
};

const migrateDatabase = ({ version, swapConfigPath }) => {
  makeNativeCommandRunner(
    makeForgeSwapRunCommand(version, {
      swapConfigPath,
      runType: 'eval "ForgeSwap.Release.migrate"',
    }),
    { silent: true }
  )();
};

const ensureRequirements = async swapConfig => {
  await ensureChains(swapConfig.chains);
  await ensureDatabaseRequirement(swapConfig.database);
};

const startSwap = async (version = '') => {
  printInfo('Using forge swap version', chalk.cyan(version));

  const forgeSwapBinPath = getReleaseBinPath('forge_swap', version);
  if (!fs.existsSync(forgeSwapBinPath)) {
    printError(
      'Invalid forge swap bin path',
      chalk.cyan(forgeSwapBinPath),
      'please ensure it\'s been downloaded' // prettier-ignore
    );
    process.exit(1);
  }

  const swapConfigPath = getForgeSwapConfigFile();
  if (!fs.existsSync(swapConfigPath)) {
    printError(
      'forge swap config file does not exist, please generate it by run:',
      chalk.cyan('forge swap config')
    );
    process.exit(1);
  }

  const swapConfig = await readForgeSwapConfig(swapConfigPath);

  const swapWebAddress = `${swapConfig.service.schema}://${swapConfig.service.host}:${swapConfig.service.port}`;
  const { pid } = await getForgeSwapProcess();
  if (pid > 0) {
    printInfo(`Forge swap has already started at ${swapWebAddress}`);
    process.exit(0);
  }

  await ensureRequirements(swapConfig);
  migrateDatabase({ version, swapConfigPath });

  makeNativeCommandRunner(
    makeForgeSwapRunCommand(version, {
      swapConfigPath,
    })
  )();

  const spinner = getSpinner('Waiting forge swap start....');

  spinner.start();
  await sleep(18 * 1000);
  const swapProcess = await getForgeSwapProcess();
  if (swapProcess.pid <= 0) {
    spinner.fail('Forge swap start failed.');
    process.exit(1);
  }

  spinner.succeed(`Forge swap web started at ${swapWebAddress}`);
};

const stopSwap = async () => {
  const { pid } = await getForgeSwapProcess();
  if (pid === 0) {
    printWarning(`Forge swap service did not start, please run ${chalk.cyan('forge swap start')}`);
    process.exit(0);
  }

  debug('swap pid:', pid);
  const [{ bin }] = await findProcess('pid', pid);
  const matchResult = bin.match(SEMVER_REGEX);

  if (!matchResult) {
    printError(`get forge swap version failed, bin: ${bin}, pid: ${pid}`);
    process.exit(1);
  }

  const version = matchResult[1];
  makeNativeCommandRunner(makeForgeSwapRunCommand(version, { subcommand: 'stop' }))();
  const spinner = getSpinner('Waiting for Forge Swap stopped...');
  spinner.start();
  await waitUntilTruthy(async () => {
    const processInfo = await getForgeSwapProcess();
    return processInfo.pid === 0;
  }, 10 * 1000);
  spinner.succeed('Forge Swap stopped.');
};

async function run({ args: [action = 'config', version] }) {
  if (version && !semver.valid(version)) {
    printError('Invalid version:', version);
    process.exit(1);
  }

  if (!version) {
    version = getGlobalForgeVersion(); // eslint-disable-line
  }

  if (semver.lt(version, '0.39.1')) {
    printError('Forge swap service only supported at version greater than', chalk.cyan('0.39.1'));
    process.exit(1);
  }

  switch (action) {
    case 'config':
      await configSwap();
      break;
    case 'start':
      await startSwap(version);
      break;
    case 'stop':
      await stopSwap(version);
      break;
    default:
      printError(
        'Invalid action:',
        action,
        `currently support: ${chalk.cyan('config')}, ${chalk.cyan('start')}`
      );
      break;
  }
}

exports.run = run;
