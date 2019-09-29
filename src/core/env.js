/* eslint-disable no-console */

const fs = require('fs');
const util = require('util');
const path = require('path');
const chalk = require('chalk');
const shell = require('shelljs');
const execa = require('execa');
const semver = require('semver');
const base64 = require('base64-url');
const inquirer = require('inquirer');
const isElevated = require('is-elevated');
const { get, set } = require('lodash');
const { fromSecretKey } = require('@arcblock/forge-wallet');
const { bytesToHex, hexToBytes, isHexStrict } = require('@arcblock/forge-util');
const GRpcClient = require('@arcblock/grpc-client');
const { parse } = require('@arcblock/forge-config');

const {
  getChainDirectory,
  isChainExists,
  isDirectory,
  getChainReleaseFilePath,
} = require('core/forge-fs');
const { ensureForgeRelease } = require('core/forge-config');
const { isForgeStarted, getProcessTag, getAllProcesses } = require('./forge-process');
const { inquire } = require('./libs/interaction');
const { printError, print, printInfo, printLogo, printSuccess, printWarning } = require('./util');
const { hasChains, getTopChainName, DEFAULT_CHAIN_NAME_RETURN } = require('./libs/common');

const { REQUIRED_DIRS } = require('../constant');
const { version } = require('../../package.json');
const { symbols, hr, wrapSpinner } = require('./ui');
const debug = require('./debug')('env');

const CURRENT_WORKING_CHAIN = getChainDirectory(process.env.FORGE_CURRENT_CHAIN);
process.env.CURRENT_WORKING_CHAIN = CURRENT_WORKING_CHAIN;

const config = { cli: {} }; // global shared forge-cli run time config

/**
 * Setup running env for various commands, the check order for each requirement is important
 * Since a running node requires a release directory
 * An unlocked wallet requires a valid config
 * TODO: args 参数应该可以去掉
 * @param {*} args
 * @param {*} requirements
 * @param {boolean|function} requirements.runningNode Indicate whether the command need a running node
 * @param {boolean|function} requirements.chainName Indicate whether the command need `chainName` arg
 * @param {boolean} requirements.chainExists Indicate whether the command need the `chain` to exists, if the attribute is true, the `requirements.chainName` will be true
 * @param {boolean} requirements.currentChainRunning Indicate whether the command need the `chain` to be running
 * @param {boolean|function} requirements.forgeRelease Indicate whether the command need forge release to exits
 * @param {boolean|function} requirements.wallet Indicate whether the command need a wallet
 * @param {boolean|function} requirements.rpcClient Indicate whether the command need RPC source
 * @param {*} opts
 */
async function setupEnv(args, requirements, opts = {}) {
  await ensureNonRoot();

  ensureRequiredDirs();
  await checkUpdate(opts);

  await ensureChainName(requirements.chainName, requirements.chainExists, opts);
  await ensureChainExists(requirements.chainExists, process.env.FORGE_CURRENT_CHAIN);
  await ensureCurrentChainRunning(
    requirements.currentChainRunning,
    process.env.FORGE_CURRENT_CHAIN
  );
  await ensureRunningNode(requirements.runningNode, process.env.FORGE_CURRENT_CHAIN);

  // Support evaluating requirements at runtime
  Object.keys(requirements).forEach(x => {
    if (typeof requirements[x] === 'function') {
      requirements[x] = requirements[x](args);
    }
  });

  if (requirements.forgeRelease || requirements.runningNode) {
    const cliConfig = await ensureForgeRelease({
      exitOn404: true,
      chainName: opts.chainName,
      allowMultiChain: opts.allowMultiChain,
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
}

async function ensureRunningNode(requirement) {
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

async function ensureChainName(requirement = true, chainExistsRequirement, args) {
  if (args.chainName) {
    process.env.FORGE_CURRENT_CHAIN = args.chainName;
    return;
  }

  if (requirement || chainExistsRequirement) {
    if (typeof requirement === 'function') {
      const chainName = await requirement(args);
      if (chainName === DEFAULT_CHAIN_NAME_RETURN.NO_CHAINS) {
        printWarning(
          `There are no chains, please create it by run ${chalk.cyan('forge chain:create')}`
        );
        process.exit(0);
      }

      process.env.FORGE_CURRENT_CHAIN = chainName;
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

async function ensureChainExists(requirement = true, chainName) {
  if (requirement === true) {
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
    if (process.env.FORGE_CONFIG) {
      shell.echo(
        `${symbols.info} ${chalk.yellow(`Using custom forge config: ${process.env.FORGE_CONFIG}`)}`
      );
    }
    const forgeConfig = parse(configPath);
    config.cli.forgeConfigPath = configPath;
    Object.assign(config, forgeConfig);
    debug(`${symbols.success} Using forge config: ${configPath}`);
    debug(
      `${symbols.success} Using forge config: ${util.inspect(config, { depth: 5, colors: true })}`
    );
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
  const wallet = readCache('wallet');
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
    writeCache('wallet', {
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
      shell.echo(
        `${symbols.error} ${chalk.red('Error: forge cannot be started with root permission')}`
      );
      shell.echo(
        `${symbols.info} Checkout the following guide on how to run forge as non-root user`
      );
      shell.echo('https://github.com/sindresorhus/guides/blob/master/npm-global-without-sudo.md');
      process.exit(77);
    }
  } catch (err) {
    debug.error(err);
    shell.echo(`${symbols.error} cannot get current username`);
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
        shell.echo(`${symbols.success} initialized ${x} dir for forge-cli: ${dir}`);
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

      if (['webBinPath', 'simulatorBinPath'].includes(executable)) {
        command = `${erlAflagsParam} FORGE_CONFIG=${forgeConfigPath} FORGE_SOCK_GRPC=${sockGrpc} ${binPath} ${subCommand}`; // eslint-disable-line
      }

      if (env) {
        debug('makeNativeCommandRunner env:', env);
        command = `${env} ${command}`;
      }

      debug(`runNativeCommand.${executable}:`, command);
      return shell.exec(command, options);
    };
  };
}

function writeCache(key, data) {
  try {
    fs.writeFileSync(path.join(REQUIRED_DIRS.cache, `${key}.json`), JSON.stringify(data));
    debug(`${symbols.success} cache ${key} write success!`);
    return true;
  } catch (err) {
    debug.error(`${symbols.error} cache ${key} write failed!`, err);
    return false;
  }
}

function readCache(key) {
  try {
    const filePath = path.join(REQUIRED_DIRS.cache, `${key}.json`);
    return JSON.parse(fs.readFileSync(filePath));
  } catch (err) {
    debug.error(`${symbols.error} cache ${key} read failed!`);
    return null;
  }
}

async function checkUpdate({ silent, defaults, yes, npmRegistry: registry, autoUpgrade }) {
  if (autoUpgrade === false) {
    return;
  }

  const lastCheck = readCache('check-update');
  const now = Math.floor(Date.now() / 1000);
  const secondsOfDay = 24 * 60 * 60;
  debug('check update', { lastCheck, now });
  if (lastCheck && lastCheck + secondsOfDay > now) {
    return;
  }

  writeCache('check-update', now);

  const { stdout: latest } = await wrapSpinner('Checking new version...', () => {
    let cmd = 'npm view @arcblock/forge-cli version';
    if (registry) {
      cmd = `${cmd} --registry=${registry}`;
    }
    debug('check update command', cmd);
    return execa.command(cmd, { silent: true });
  });
  const installed = version;
  debug('check update', { latest, installed });

  if (semver.gt(latest.trim(), installed.trim())) {
    print(
      chalk.red(
        `${
          symbols.info
        } Latest forge-cli version is v${latest.trim()}, your local version v${installed.trim()}`
      )
    );

    const { confirm } = await inquire(
      [
        {
          name: 'confirm',
          type: 'confirm',
          message: 'Upgrade?',
          default: false,
        },
      ],
      { defaults, silent, yes }
    );

    if (confirm) {
      printSuccess(`Updating to ${latest.trim()}...`);
      execa.commandSync('npm install -g @arcblock/forge-cli', { stdio: [0, 1, 2] });
    }
  }
}

// Because some comments have special usage, we need to add it back
function ensureConfigComment(str) {
  return str.replace(
    '[[tendermint.genesis.validators]]',
    '### begin validators\n[[tendermint.genesis.validators]]\n### end validators'
  );
}

function getModeratorSecretKey() {
  const sk = process.env.FORGE_MODERATOR_SK;

  if (!sk) {
    return undefined;
  }

  if (isHexStrict(sk)) {
    return sk;
  }

  return bytesToHex(Buffer.from(base64.unescape(sk), 'base64'));
}

function getModerator() {
  const sk = getModeratorSecretKey();
  if (sk) {
    const wallet = fromSecretKey(sk);
    return {
      address: wallet.toAddress(),
      publicKey: base64.escape(base64.encode(hexToBytes(wallet.publicKey))),
    };
  }

  return undefined;
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
  cache: {
    write: writeCache,
    read: readCache,
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
  runNativeWorkshopCommand: makeNativeCommandRunner('workshopBinPath', 'workshop'),
  runNativeSimulatorCommand: makeNativeCommandRunner('simulatorBinPath', 'simulator'),
  getModerator,
  createRpcClient,
  isDirectory,
  printLogo,
  ensureConfigComment,
};
