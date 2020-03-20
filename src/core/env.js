/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const shell = require('shelljs');
const semver = require('semver');
const inquirer = require('inquirer');
const isElevated = require('is-elevated');
const { get, set, pickBy } = require('lodash');
const GRpcClient = require('@arcblock/grpc-client');
const { parse } = require('@arcblock/forge-config');

const {
  getChainDirectory,
  isChainExists,
  isDirectory,
  isFile,
  getChainReleaseFilePath,
  getChainWebConfigPath,
  getChainNameFromForgeConfig,
} = require('core/forge-fs');
const { ensureForgeRelease } = require('core/forge-config');
const { isForgeStarted, getProcessTag, getAllProcesses } = require('./forge-process');
const { printError, printInfo, printLogo, printWarning } = require('./util');
const { hasChains, getOSUserInfo, getTopChainName, cache } = require('./libs/common');

const { DEFAULT_CHAIN_NAME_RETURN, REQUIRED_DIRS } = require('../constant');
const { symbols, hr, pretty } = require('./ui');
const debug = require('./debug')('env');

const CURRENT_WORKING_CHAIN = getChainDirectory(process.env.FORGE_CURRENT_CHAIN);
process.env.CURRENT_WORKING_CHAIN = CURRENT_WORKING_CHAIN;

const config = { cli: {} }; // global shared forge-cli run time config

/**
 * Setup running env for various commands, the check order for each requirement is important
 * Since a running node requires a release directory
 * An unlocked wallet requires a valid config
 * @param {*} requirements
 * @param {boolean|function} requirements.runningNode Indicate whether the command need a running node
 * @param {boolean|string|function} requirements.chainName Indicate whether the command need `chainName` arg, possible: boolean, 'required', function
 * @param {boolean} requirements.chainExists Indicate whether the command need the `chain` to exists, if the attribute is true, the `requirements.chainName` will be true
 * @param {boolean} requirements.currentChainRunning Indicate whether the command need the `chain` to be running
 * @param {boolean|function} requirements.forgeRelease Indicate whether the command need forge release to exits
 * @param {boolean|function} requirements.wallet Indicate whether the command need a wallet
 * @param {boolean|function} requirements.rpcClient Indicate whether the command need RPC source
 * @param {*} args
 */
async function setupEnv(requirements, args = {}) {
  ensureEnv(args);
  await ensureNonRoot();
  ensureRequiredDirs();

  await ensureChainName(requirements.chainName, args);
  if (process.env.FORGE_CURRENT_CHAIN) {
    printInfo(`Working on ${chalk.cyan(process.env.FORGE_CURRENT_CHAIN)} chain`);
  }

  await ensureChainExists({
    requirement: requirements.chainExists,
    chainName: process.env.FORGE_CURRENT_CHAIN,
    configPath: process.env.FORGE_CONFIG,
  });

  await ensureCurrentChainRunning(
    requirements.currentChainRunning,
    process.env.FORGE_CURRENT_CHAIN
  );
  await ensureRunningChain(requirements.runningNode, process.env.FORGE_CURRENT_CHAIN);

  // Support evaluating requirements at runtime
  Object.keys(requirements).forEach(x => {
    if (typeof requirements[x] === 'function') {
      requirements[x] = requirements[x](args);
    }
  });

  if (requirements.forgeRelease || requirements.runningNode) {
    const cliConfig = await ensureForgeRelease({
      exitOn404: true,
      chainName: args.chainName,
      allowMultiChain: args.allowMultiChain,
    });
    Object.assign(config.cli, cliConfig);
  }

  ensureSetupScript(args);

  if (requirements.wallet || requirements.rpcClient || requirements.runningNode) {
    await ensureRpcClient(args, process.env.FORGE_CURRENT_CHAIN);
  }

  if (requirements.wallet) {
    await ensureWallet(args);
  }

  const result = {
    chainName: process.env.FORGE_CURRENT_CHAIN,
  };

  return pickBy(result, v => v !== undefined);
}

async function ensureRunningChain(requirement) {
  if (!requirement) {
    return;
  }

  const allProcesses = await getAllProcesses();
  if (allProcesses.length === 0) {
    printWarning('No running chains.');
    printInfo(`You can create a chain by ${chalk.cyan('forge chain:create')}, and start it.`);
    process.exit(0);
  }
}

async function ensureChainName(requirement = true, args) {
  if (args.chainName) {
    process.env.FORGE_CURRENT_CHAIN = args.chainName;
    return;
  }

  if (process.env.FORGE_CONFIG) {
    const chainId = getChainNameFromForgeConfig(process.env.FORGE_CONFIG);
    if (!chainId) {
      throw new Error(
        `Invalid config path: app name is invalid, config path: ${process.env.FORGE_CONFIG}`
      );
    }

    process.env.FORGE_CURRENT_CHAIN = chainId;
    return;
  }

  if (requirement) {
    if (typeof requirement === 'function') {
      const chainName = await requirement(args);
      if (chainName === DEFAULT_CHAIN_NAME_RETURN.NO_CHAINS) {
        printWarning(
          `There are no chains, please create it by run ${chalk.cyan('forge chain:create')}`
        );
        process.exit(0);
      } else if (chainName === DEFAULT_CHAIN_NAME_RETURN.NO_RUNNING_CHAINS) {
        printWarning('There are no running chains');
        process.exit(0);
      }

      process.env.FORGE_CURRENT_CHAIN = chainName;
    } else if (requirement === 'required') {
      printError(`${chalk.cyan('chainName')} argument is required`);
      process.exit(1);
    } else {
      const chainName = getTopChainName();
      if (!chainName) {
        printWarning(
          `There are no chains, please create it by run ${chalk.cyan('forge chain:create')}`
        );
        process.exit(0);
      }

      process.env.FORGE_CURRENT_CHAIN = chainName; // eslint-disable-line
    }
  }
}

async function ensureChainExists({ requirement = true, chainName, configPath }) {
  if (configPath) {
    const chainId = getChainNameFromForgeConfig(process.env.FORGE_CONFIG);

    if (chainId === chainName) {
      // if the chain name is specified by config path, no longer check wether the chain does exit
      return;
    }
  }

  if (chainName && requirement === true) {
    if (!hasChains()) {
      printError(
        `There are no chains found, please run ${chalk.cyan('forge chain:create')} to create.`
      );
      process.exit(1);
    }

    if (!isChainExists(chainName)) {
      printError(`Chain ${chainName} does not exist`);
      printInfo(`You can create it by run ${chalk.cyan(`forge chain:create ${chainName}`)}`);
      process.exit(1);
    }
  }
}

async function ensureCurrentChainRunning(requirement, chainName) {
  if (!requirement) {
    return true;
  }

  if (!(await isForgeStarted(chainName))) {
    printWarning(`Chain ${chalk.yellow(chainName)} is not started yet!`);
    printInfo(`Please run ${chalk.cyan(`forge start ${chainName}`)} first!`);
    process.exit(0);
  }

  return true;
}

/**
 * Ensure we have an global rpc client <grpc-client instance> before command run
 * Configure file priority: cli > env > release bundled
 *
 * @param {*} args
 */
function ensureRpcClient(args, chainName) {
  const socketGrpc = args.socketGrpc || process.env.FORGE_SOCK_GRPC;
  const configPath = getChainReleaseFilePath(chainName);

  if (socketGrpc) {
    printInfo(
      `${chalk.yellow(`Using custom grpc socket endpoint: ${process.env.FORGE_SOCK_GRPC}`)}`
    );
    const forgeConfig = {
      forge: {
        sockGrpc: socketGrpc,
        unlockTtl: 300,
        web: {
          port: 8210,
        },
      },
    };
    debug(`using forge-cli with remote node ${socketGrpc}`);
    Object.assign(config, forgeConfig);
  } else if (fs.existsSync(configPath)) {
    if (
      process.env.FORGE_CONFIG &&
      chainName === getChainNameFromForgeConfig(process.env.FORGE_CONFIG)
    ) {
      printInfo(`${chalk.yellow(`Using custom forge config: ${process.env.FORGE_CONFIG}`)}`);
    }

    const forgeConfig = parse(configPath);
    config.cli.forgeConfigPath = configPath;
    Object.assign(config, forgeConfig);
    debug(`${symbols.success} Using forge config: ${configPath}`);
    debug(`${symbols.success} Using forge config: ${pretty(config)}`);
  } else {
    throw new Error(
      `No valid rpc configuration, socketGrpc: ${socketGrpc}, configPath: ${configPath}`
    );
  }
}

/**
 * Ensure we have an unlocked wallet before run actual command { address, token }
 */
async function ensureWallet() {
  const wallet = cache.read('wallet');
  if (wallet && wallet.expireAt && wallet.expireAt > Date.now()) {
    debug(`${symbols.success} Use cached wallet ${wallet.address}`);
    config.cli.wallet = wallet;
    return;
  }

  debug(`${symbols.warning} no unlocked wallet found!`);

  const cachedAddress = wallet ? wallet.address : '';
  const questions = [
    {
      type: 'confirm',
      name: 'useCachedAddress',
      message: `Use cached wallet <${cachedAddress}>?`,
      when: !!cachedAddress,
    },
    {
      type: 'text',
      name: 'address',
      default: answers => (answers.useCachedAddress ? cachedAddress : ''),
      when: answers => !cachedAddress || !answers.useCachedAddress,
      message: 'Please enter wallet address:',
      validate: input => {
        if (!input) return 'The address should not empty';
        return true;
      },
    },
    {
      type: 'password',
      name: 'passphrase',
      message: 'Please enter passphrase of the wallet:',
      validate: input => {
        if (!input) return 'The passphrase should not empty';
        if (!/^.{6,15}$/.test(input)) return 'The passphrase must be 6~15 chars long';
        return true;
      },
    },
  ];

  const client = createRpcClient();
  const { address: userAddress, passphrase, useCachedAddress } = await inquirer.prompt(questions);
  const address = useCachedAddress ? cachedAddress : userAddress;
  try {
    const { token } = await client.loadWallet({ address, passphrase });
    cache.write('wallet', {
      address,
      token,
      expireAt: Date.now() + (config.forge.unlockTtl || 300) * 1e3,
    });
    config.cli.wallet = { address, token };
    debug(`${symbols.success} Use unlocked wallet ${address}`);
  } catch (err) {
    debug.error('Wallet Unlock Error', err);
    shell.echo(`${symbols.error} wallet unlock failed, please check wallet address and passphrase`);
    process.exit(1);
  }
}

/**
 * If we have application specific protobuf, we need to load that into sdk
 *
 * @param {*} args
 */
function ensureSetupScript(args) {
  const setupScript = args.setupScript || process.env.FORGE_SDK_SETUP_SCRIPT;
  if (setupScript && fs.existsSync(setupScript) && fs.statSync(setupScript).isFile()) {
    debug(`${symbols.warning} loading custom scripts: ${setupScript}`);
    // eslint-disable-next-line
    require(path.resolve(setupScript));
  }
}

/**
 * Find version of current forge release
 *
 * @param {*} releaseDir
 * @returns String
 */
function findReleaseVersion(releaseDir) {
  if (!releaseDir) {
    return '';
  }

  const parentDir = path.join(releaseDir, 'forge/releases');
  if (!isDirectory(parentDir)) {
    return '';
  }

  return fs
    .readdirSync(parentDir)
    .find(x => fs.statSync(path.join(parentDir, x)).isDirectory() && semver.valid(x));
}

async function ensureNonRoot() {
  try {
    if (await isElevated()) {
      printError(`${chalk.red('Error: forge cannot be started with root permission')}`);
      process.exit(77);
    }
  } catch (err) {
    debug.error(err);
    printError('Cannot get current username');
  }
}

function ensureEnv({ configPath }) {
  if (process.env.FORGE_CONFIG) {
    if (!fs.existsSync(process.env.FORGE_CONFIG)) {
      throw new Error(`env FORGE_CONFIG is invalid: ${process.env.FORGE_CONFIG}`);
    }
  } else if (configPath) {
    if (!fs.existsSync(configPath)) {
      throw new Error(`config path does not exit, config path: ${configPath}`);
    }

    process.env.FORGE_CONFIG = configPath;
  }
}

/**
 * Ensure we have required directories done
 */
function ensureRequiredDirs() {
  Object.keys(REQUIRED_DIRS).forEach(x => {
    const dir = REQUIRED_DIRS[x];
    if (isDirectory(dir)) {
      debug(`${symbols.info} ${x} dir already initialized: ${dir}`);
    } else {
      try {
        shell.mkdir('-p', dir);
        debug(`initialized ${x} dir for forge-cli: ${dir}`);
      } catch (err) {
        shell.echo(`${symbols.success} failed to initialize ${x} dir for forge-cli: ${dir}`, err);
      }
    }
  });
}

let client = null;
function createRpcClient() {
  if (client) {
    return client;
  }

  const sockGrpc =
    process.env.FORGE_SOCK_GRPC || get(config, 'forge.sockGrpc') || get(config, 'forge.sock_grpc');

  printInfo(`Connect to grpc endpoint: ${sockGrpc}`);
  client = new GRpcClient(sockGrpc);
  return client;
}

// TODO: need to refact to on name parameter
/**
 * @deprecated Use core/libs/common/makeNativeCommandRunnder
 * @param {*} executable
 * @param {*} name
 * @param {*} param2
 */
function makeNativeCommandRunner(executable, name, { env } = {}) {
  return function runNativeForgeCommand(subCommand, options = {}) {
    return function rumCommand() {
      // eslint-disable-next-line prefer-destructuring
      const forgeConfigPath = config.cli.forgeConfigPath;
      const binPath = config.cli[executable];

      if (!binPath) {
        shell.echo(`${symbols.error} ${executable} not found, abort!`);
        shell.echo(`${symbols.info} we recommend a clean setup from scratch with following steps:`);
        shell.echo(hr);
        shell.echo(`${chalk.cyan('forge stop')}`);
        shell.echo(`${chalk.cyan('rm -rf ~/.forge_cli')}`);
        shell.echo(`${chalk.cyan('rm -rf ~/.forge_chains')}`);
        shell.echo(`${chalk.cyan('npm install -g @arcblock/forge-cli')}`);
        shell.echo(`${chalk.cyan('forge install')}`);
        shell.echo('');
        return process.exit(1);
      }

      const sockGrpc =
        process.env.FORGE_SOCK_GRPC || get(config, 'forge.sockGrpc') || 'tcp://127.0.0.1:28210';

      const erlAflagsParam = `ERL_AFLAGS="-sname ${getProcessTag(
        name,
        process.env.FORGE_CURRENT_CHAIN
      )}"`;
      let command = `${erlAflagsParam} FORGE_CONFIG=${forgeConfigPath} ${binPath} ${subCommand}`;

      if (executable === 'webBinPath') {
        const webConfigPath = getChainWebConfigPath(name);
        if (isFile(webConfigPath)) {
          command = `${erlAflagsParam} FORGE_WEB_CONFIG=${webConfigPath} FORGE_SOCK_GRPC=${sockGrpc} ${binPath} ${subCommand}`; // eslint-disable-line
        } else {
          command = `${erlAflagsParam} FORGE_SOCK_GRPC=${sockGrpc} ${binPath} ${subCommand}`; // eslint-disable-line
        }
      }

      if (executable === 'simulatorBinPath') {
        command = `${erlAflagsParam} FORGE_SOCK_GRPC=${sockGrpc} ${binPath} ${subCommand}`; // eslint-disable-line
      }

      if (env) {
        debug('makeNativeCommandRunner env:', env);
        command = `${env} ${command}`;
      }

      const { shell: envShell, homedir } = getOSUserInfo();
      command = `SHELL=${envShell} HOME=${homedir} ${command}`;

      debug(`runNativeCommand.${executable}:`, command);
      return shell.exec(command, options);
    };
  };
}

// Because some comments have special usage, we need to add it back
function ensureConfigComment(str) {
  return str.replace(
    '[[tendermint.genesis.validators]]',
    '### begin validators\n[[tendermint.genesis.validators]]\n### end validators'
  );
}

debug.error = (...args) => {
  if (debug.enabled) {
    console.error(...args);
  }
};

module.exports = {
  config: {
    get: (key, defaultValue) => get(config, key, defaultValue),
    set: (key, value) => set(config, key, value),
  },

  webUrl() {
    return `http://localhost:${get(config, 'forge.web.port') || 8210}`;
  },

  debug,
  setupEnv,
  findReleaseVersion,
  ensureRequiredDirs,
  ensureRpcClient,
  makeNativeCommandRunner,
  runNativeWebCommand: makeNativeCommandRunner('webBinPath', 'web'),
  runNativeSimulatorCommand: makeNativeCommandRunner('simulatorBinPath', 'simulator'),
  createRpcClient,
  isDirectory,
  printLogo,
  ensureConfigComment,
};
