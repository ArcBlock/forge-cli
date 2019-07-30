/* eslint-disable no-console */

const fs = require('fs');
const os = require('os');
const util = require('util');
const path = require('path');
const getos = require('getos');
const chalk = require('chalk');
const yaml = require('yaml');
const shell = require('shelljs');
const semver = require('semver');
const inquirer = require('inquirer');
const isElevated = require('is-elevated');
const { get, set } = require('lodash');

const GRpcClient = require('@arcblock/grpc-client');
const { parse } = require('@arcblock/forge-config');
const TOML = require('@iarna/toml');

const {
  getProfileDirectory,
  getCurrentReleaseFilePath,
  isDirectory,
  getOriginForgeReleaseFilePath,
} = require('core/forge-fs');
const { findServicePid, isForgeStarted, getProcessTag } = require('./forge-process');
const { printLogo } = require('./util');
const { setConfigToProfile } = require('./forge-config');

const { version, engines } = require('../../package.json');

const { symbols, hr } = require('./ui');
const debug = require('./debug')('env');

const CURRENT_WORKING_PROFILE = getProfileDirectory(process.env.PROFILE_NAME);
process.env.CURRENT_WORKING_PROFILE = CURRENT_WORKING_PROFILE;

const baseDir = path.join(os.homedir(), '.forge_cli');

const requiredDirs = {
  tmp: path.join(baseDir, 'tmp'),
  bin: path.join(baseDir, 'bin'),
  cache: path.join(baseDir, 'cache'),
  release: path.join(baseDir, 'release'),
};

if (process.env.PROFILE_NAME !== 'default') {
  shell.echo(hr);
  shell.echo(`${symbols.success} Current Chain: ${chalk.cyan(process.env.PROFILE_NAME)}`);
  shell.echo(hr);
}

const config = { cli: { requiredDirs } }; // global shared forge-cli run time config

/**
 * Setup running env for various commands, the check order for each requirement is important
 * Since a running node requires a release directory
 * An unlocked wallet requires a valid config
 *
 * @param {*} args
 * @param {*} requirements
 */
async function setupEnv(args, requirements) {
  await ensureNonRoot();

  // Support evaluating requirements at runtime
  Object.keys(requirements).forEach(x => {
    if (typeof requirements[x] === 'function') {
      requirements[x] = requirements[x](args);
    }
  });

  debug('setupEnv.args', { args, requirements });

  ensureRequiredDirs();
  checkUpdate();

  if (requirements.forgeRelease || requirements.runningNode) {
    await ensureForgeRelease(args);
  }

  ensureSetupScript(args);

  if (requirements.wallet || requirements.rpcClient || requirements.runningNode) {
    await ensureRpcClient(args);
  }

  if (requirements.runningNode) {
    await ensureRunningNode(args);
  }

  if (requirements.wallet) {
    await ensureWallet(args);
  }
}

function isFile(x) {
  return fs.existsSync(x) && fs.statSync(x).isFile();
}

function isEmptyDirectory(x) {
  return isDirectory(x) && fs.readdirSync(x).length === 0;
}

/**
 * Ensure we have a forge release to work with, in which we find forge bin
 *
 * @param {*} args
 * @param {boolean} [exitOn404=true]
 * @returns
 */
async function ensureForgeRelease(args, exitOn404 = true) {
  const envReleaseDir = process.env.FORGE_RELEASE_DIR;
  const cliReleaseDir = requiredDirs.release;
  const argReleaseDir = args.releaseDir;
  if (envReleaseDir || argReleaseDir) {
    shell.echo(
      `${symbols.info} ${chalk.yellow(
        `Using custom release dir: ${envReleaseDir || argReleaseDir}`
      )}`
    );
  }

  const releaseDir = argReleaseDir || envReleaseDir || cliReleaseDir;
  if (fs.existsSync(releaseDir)) {
    const releaseYamlPath = path.join(releaseDir, './forge/release.yml');
    if (!fs.existsSync(releaseYamlPath)) {
      if (exitOn404) {
        shell.echo(`${symbols.error} required config file ${releaseYamlPath} not found`);
        shell.echo(
          `${symbols.info} if you have not setup forge yet, please run ${chalk.cyan(
            'forge install'
          )} first`
        );
        process.exit(1);
      }
      return false;
    }

    try {
      const releaseYamlObj = yaml.parse(fs.readFileSync(releaseYamlPath).toString());
      if (!releaseYamlObj || !releaseYamlObj.current) {
        throw new Error('no current forge release selected');
      }

      config.cli.currentVersion = releaseYamlObj.current;
    } catch (err) {
      debug.error(err);
      if (exitOn404) {
        shell.echo(`${symbols.error} config file ${releaseYamlPath} invalid`);
        process.exit(1);
      }

      return false;
    }

    // simulator
    // eslint-disable-next-line prefer-destructuring
    const currentVersion = config.cli.currentVersion;
    const simulatorBinPath = path.join(releaseDir, 'simulator', currentVersion, './bin/simulator');
    if (fs.existsSync(simulatorBinPath) && fs.statSync(simulatorBinPath).isFile()) {
      debug(`${symbols.success} Using simulator executable: ${simulatorBinPath}`);
      config.cli.simulatorBinPath = simulatorBinPath;
    }

    // forge_starter
    const starterBinPath = path.join(
      releaseDir,
      'forge_starter',
      currentVersion,
      './bin/forge_starter'
    );
    if (fs.existsSync(starterBinPath) && fs.statSync(starterBinPath).isFile()) {
      debug(`${symbols.success} Using forge_starter executable: ${starterBinPath}`);
      config.cli.starterBinPath = starterBinPath;
    } else {
      if (exitOn404) {
        shell.echo(
          `${symbols.error} forge_starter binary not found, please run ${chalk.cyan(
            'forge install'
          )} first`
        );
        process.exit(1);
      }
      return false;
    }

    // forge_web
    const webBinPath = path.join(releaseDir, 'forge_web', currentVersion, './bin/forge_web');
    if (fs.existsSync(webBinPath) && fs.statSync(webBinPath).isFile()) {
      debug(`${symbols.success} Using forge_web executable: ${webBinPath}`);
      config.cli.webBinPath = webBinPath;
    }

    // forge_workshop
    const workshopBinPath = path.join(
      releaseDir,
      'forge_workshop',
      currentVersion,
      './bin/forge_workshop'
    );
    if (fs.existsSync(workshopBinPath) && fs.statSync(workshopBinPath).isFile()) {
      debug(`${symbols.success} Using forge_web executable: ${workshopBinPath}`);
      config.cli.workshopBinPath = workshopBinPath;
    }

    // forge_kernel
    const forgeBinPath = path.join(releaseDir, 'forge', currentVersion, './bin/forge');
    if (fs.existsSync(forgeBinPath) && fs.statSync(forgeBinPath).isFile()) {
      config.cli.releaseDir = releaseDir;
      config.cli.forgeBinPath = forgeBinPath;
      config.cli.forgeReleaseDir = path.join(releaseDir, 'forge');
      debug(`${symbols.success} Using forge release dir: ${releaseDir}`);
      debug(`${symbols.success} Using forge executable: ${forgeBinPath}`);

      if (semver.satisfies(currentVersion, engines.forge)) {
        if (process.env.PROFILE_NAME === 'default') {
          await copyReleaseConfig(currentVersion, false);
        }

        return releaseDir;
      }

      if (exitOn404) {
        shell.echo(
          `${symbols.error} forge-cli@${version} requires forge@${
            engines.forge
          } to work, but got ${currentVersion}!`
        );
        shell.echo(
          `${symbols.info} if you want to use forge-cli@${version}, please following below steps:`
        );
        shell.echo(hr);
        shell.echo(
          `1. run ${chalk.cyan('ps aux | grep forge')}, and kill all forge related processes`
        );
        shell.echo(`2. cleanup forge release dir: ${chalk.cyan('rm -rf ~/.forge_release')}`);
        shell.echo(`3. cleanup forge cli dir: ${chalk.cyan('rm -rf ~/.forge_cli')}`);
        shell.echo(`4. install latest forge: ${chalk.cyan('forge install')}`);
        shell.echo(`5. start latest forge: ${chalk.cyan('forge start')}`);
        process.exit(1);
      }
    } else if (exitOn404) {
      shell.echo(
        `${symbols.error} forge release binary not found, please run ${chalk.cyan(
          'forge install'
        )} first`
      );
      process.exit(1);
    }
  } else if (exitOn404) {
    shell.echo(`${symbols.error} forge release dir does not exist

  You can either run ${chalk.cyan('forge install')} to get the latest forge release.
  Or start node with custom forge release folder
  > ${chalk.cyan('forge start --release-dir ~/Downloads/forge/')}
  > ${chalk.cyan('FORGE_RELEASE_DIR=~/Downloads/forge/ forge start')}
      `);
    process.exit(1);
  }

  return false;
}

async function writeCurrentProfileToReleaseConfig(releaseConfigPath) {
  let content = fs.readFileSync(releaseConfigPath);

  content = await setConfigToProfile(TOML.parse(content.toString()));
  return TOML.stringify(content);
}

async function copyReleaseConfig(currentVersion, overwrite = true) {
  const targetPath = getCurrentReleaseFilePath();
  if (fs.existsSync(targetPath) && !overwrite) {
    return;
  }

  const sourcePath = getOriginForgeReleaseFilePath('forge', currentVersion);

  if (sourcePath) {
    shell.echo(`${symbols.success} Extract forge config from ${sourcePath}`);
    fs.writeFileSync(targetPath, await writeCurrentProfileToReleaseConfig(sourcePath));
    shell.echo(`${symbols.success} Forge config written to ${targetPath}`);
  } else {
    shell.echo(`${symbols.error} Forge config not found under release folder`);
    process.exit(1);
  }
}

async function ensureRunningNode() {
  if (!(await isForgeStarted())) {
    shell.echo(`${symbols.error} forge is not started yet!`);
    shell.echo(`${symbols.info} Please run ${chalk.cyan('forge start')} first!`);
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
function ensureRpcClient(args) {
  const releaseConfig = path.join(path.dirname(requiredDirs.release), 'forge_release.toml');
  const configPath = args.configPath || process.env.FORGE_CONFIG || releaseConfig;

  if (configPath && fs.existsSync(configPath)) {
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
  }

  const socketGrpc = args.socketGrpc || process.env.FORGE_SOCK_GRPC;
  if (socketGrpc) {
    shell.echo(
      `${symbols.info} ${chalk.yellow(
        `Using custom grpc socket endpoint: ${process.env.FORGE_SOCK_GRPC}`
      )}`
    );
    debug(`${symbols.info} using forge-cli with remote node ${socketGrpc}`);
    set(config, 'forge.sockGrpc', socketGrpc);
  }

  if (!configPath && !socketGrpc) {
    shell.echo(`${symbols.error} this command requires a valid forge config file to start
If you have not setup any forge core release on this machine, run this first:
> ${chalk.cyan('forge install')}
Or you can run forge-cli with custom config path
> ${chalk.cyan('forge start --config-path ~/Downloads/forge/forge_release.toml')}
> ${chalk.cyan('FORGE_CONFIG=~/Downloads/forge/forge_release.toml forge start')}
    `);
    process.exit(1);
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
  Object.keys(requiredDirs).forEach(x => {
    const dir = requiredDirs[x];
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

  shell.echo(`${symbols.info} Connect to grpc endpoint: ${sockGrpc}`);
  client = new GRpcClient(sockGrpc);
  return client;
}

// TODO: need to refact to on name parameter
function makeNativeCommandRunner(executable, name) {
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
        shell.echo(`${chalk.cyan('rm -rf ~/.forge_release')}`);
        shell.echo(`${chalk.cyan('npm install -g @arcblock/forge-cli')}`);
        shell.echo(`${chalk.cyan('forge install')}`);
        shell.echo('');
        return process.exit(1);
      }

      const sockGrpc =
        process.env.FORGE_SOCK_GRPC || get(config, 'forge.sockGrpc') || 'tcp://127.0.0.1:28210';

      const erlAflagsParam = `ERL_AFLAGS="-sname ${getProcessTag(name)}"`;
      let command = `${erlAflagsParam} FORGE_CONFIG=${forgeConfigPath} ${binPath} ${subCommand}`;
      if (['webBinPath', 'simulatorBinPath'].includes(executable)) {
        command = `${erlAflagsParam} FORGE_CONFIG=${forgeConfigPath} FORGE_SOCK_GRPC=${sockGrpc} ${binPath} ${subCommand}`; // eslint-disable-line
      }

      debug(`runNativeCommand.${executable}`, command);
      return shell.exec(command, options);
    };
  };
}

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
        console.error(err);
        return reject(err);
      }

      if (info.os === 'darwin') {
        return resolve(info.os);
      }

      if (info.os === 'linux') {
        return resolve('centos');
      }

      shell.echo(`${symbols.error} Oops, ${info.os} is not supported by forge currently`);
      process.exit(1);
      return resolve(info.os);
    });
  });
}

function writeCache(key, data) {
  try {
    fs.writeFileSync(path.join(requiredDirs.cache, `${key}.json`), JSON.stringify(data));
    debug(`${symbols.success} cache ${key} write success!`);
    return true;
  } catch (err) {
    debug.error(`${symbols.error} cache ${key} write failed!`, err);
    return false;
  }
}

function readCache(key) {
  try {
    const filePath = path.join(requiredDirs.cache, `${key}.json`);
    return JSON.parse(fs.readFileSync(filePath));
  } catch (err) {
    debug.error(`${symbols.error} cache ${key} read failed!`);
    return null;
  }
}

function checkUpdate() {
  const lastCheck = readCache('check-update');
  const now = Math.floor(Date.now() / 1000);
  const secondsOfDay = 24 * 60 * 60;
  debug('check update', { lastCheck, now });
  if (lastCheck && lastCheck + secondsOfDay > now) {
    return;
  }
  writeCache('check-update', now);

  const { stdout: latest } = shell.exec('npm view @arcblock/forge-cli version', { silent: true });
  const installed = version;
  debug('check update', { latest, installed });

  if (semver.gt(latest.trim(), installed.trim())) {
    shell.echo('');
    shell.echo(
      chalk.red(
        `${
          symbols.info
        } Latest forge-cli version is v${latest.trim()}, your local version v${installed.trim()}`
      )
    );
    shell.echo(
      chalk.red(
        `${symbols.info} Please upgrade with ${chalk.cyan('npm install -g @arcblock/forge-cli')}`
      )
    );
    shell.echo('');
  }
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
  cache: {
    write: writeCache,
    read: readCache,
  },

  webUrl() {
    return `http://localhost:${get(config, 'forge.web.port') || 8210}`;
  },

  DEFAULT_MIRROR: 'https://releases.arcblock.io',
  RELEASE_ASSETS: ['forge', 'forge_starter', 'simulator', 'forge_web', 'forge_workshop'],

  debug,
  setupEnv,
  requiredDirs,
  copyReleaseConfig,
  findReleaseVersion,
  ensureRequiredDirs,
  ensureForgeRelease,
  ensureRpcClient,
  setConfigToProfile,
  runNativeForgeCommand: makeNativeCommandRunner('forgeBinPath'),
  runNativeWebCommand: makeNativeCommandRunner('webBinPath', 'web'),
  runNativeWorkshopCommand: makeNativeCommandRunner('workshopBinPath', 'workshop'),
  runNativeStarterCommand: makeNativeCommandRunner('starterBinPath', 'starter'), // deprecated
  runNativeSimulatorCommand: makeNativeCommandRunner('simulatorBinPath', 'simulator'),
  findServicePid,
  getPlatform,
  createRpcClient,
  isDirectory,
  isFile,
  isEmptyDirectory,
  printLogo,
  ensureConfigComment,
};
