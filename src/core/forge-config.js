const chalk = require('chalk');
const fs = require('fs');
const semver = require('semver');
const path = require('path');
const { get, set } = require('lodash');
const TOML = require('@iarna/toml');
const internalIp = require('internal-ip');

const { getModerator } = require('core/moderator');

const {
  DEFAULT_CHAIN_NAME,
  DEFAULT_FORGE_WEB_PORT,
  DEFAULT_WORKSHOP_PORT,
  DEFAULT_FORGE_GRPC_PORT,
  REQUIRED_DIRS,
} = require('../constant');
const {
  getAllAppDirectories,
  getDataDirectory,
  getRootConfigDirectory,
  getForgeVersionFromYaml,
  getChainConfigPath,
  getChainWorkshopDirectory,
  getChainDirectory,
  getChainReleaseFilePath,
} = require('./forge-fs');
const { makeRange, getPort, getFreePort, print, printError, printInfo } = require('./util');
const { hr, symbols } = require('./ui');
const {
  applyForgeVersion,
  checkSatisfiedForgeVersion,
  getLocalVersions,
  hasReleases,
} = require('./libs/common');
const debug = require('./debug')('forge-config');
const { version, engines } = require('../../package.json');

function getPortFromUri(uri) {
  if (!uri || typeof uri !== 'string') {
    return 0;
  }

  const port = Number(uri.slice(uri.lastIndexOf(':') + 1));
  return Number.isNaN(port) ? 0 : port;
}

async function getUsedPortsByForge() {
  const configDirectories = getAllAppDirectories();

  const maxPortPerField = {
    forgeWebPort: 0,
    forgeGrpcPort: 0,
    tendermintRpcPort: 0,
    tendermintGrpcPort: 0,
    tendermintP2pPort: 0,
    workshopPort: 0,
  };

  configDirectories.forEach(tmp => {
    const dir = path.join(getRootConfigDirectory(), tmp);
    const forgeReleasePath = path.join(dir, 'forge_release.toml');
    if (!fs.existsSync(forgeReleasePath)) {
      return;
    }

    const cfg = TOML.parse(fs.readFileSync(forgeReleasePath).toString());

    const forgeWebPort = Number(get(cfg, 'forge.web.port'));
    const workshopPort = Number(get(cfg, 'workshop.port'));
    const forgeGrpcPort = getPortFromUri(get(cfg, 'forge.sock_grpc'));
    const tendermintRpcPort = getPortFromUri(get(cfg, 'tendermint.sock_rpc'));
    const tendermintGrpcPort = getPortFromUri(get(cfg, 'tendermint.sock_grpc'));
    const tendermintP2pPort = getPortFromUri(get(cfg, 'tendermint.sock_p2p'));

    if (forgeWebPort > maxPortPerField.forgeWebPort) {
      maxPortPerField.forgeWebPort = forgeWebPort;
    }

    if (workshopPort > maxPortPerField.workshopPort) {
      maxPortPerField.workshopPort = workshopPort;
    }

    if (forgeGrpcPort > maxPortPerField.forgeGrpcPort) {
      maxPortPerField.forgeGrpcPort = forgeGrpcPort;
    }

    if (tendermintRpcPort > maxPortPerField.tendermintRpcPort) {
      maxPortPerField.tendermintRpcPort = tendermintRpcPort;
    }
    if (tendermintGrpcPort > maxPortPerField.tendermintGrpcPort) {
      maxPortPerField.tendermintGrpcPort = tendermintGrpcPort;
    }

    if (tendermintP2pPort > maxPortPerField.tendermintP2pPort) {
      maxPortPerField.tendermintP2pPort = tendermintP2pPort;
    }
  });

  return maxPortPerField;
}

async function getAvailablePort() {
  const {
    forgeWebPort,
    forgeGrpcPort,
    tendermintRpcPort,
    tendermintGrpcPort,
    tendermintP2pPort,
    workshopPort,
  } = await getUsedPortsByForge();

  const res = {
    forgeWebPort: forgeWebPort
      ? forgeWebPort + 1
      : await getPort({ port: getPort.makeRange(8210, 8300) }),
    tendermintRpcPort: tendermintRpcPort
      ? tendermintRpcPort + 1
      : await getPort({ port: getPort.makeRange(32001, 34000) }),
    tendermintGrpcPort: tendermintGrpcPort
      ? tendermintGrpcPort + 1
      : await getPort({ port: getPort.makeRange(36001, 37000) }),
    tendermintP2pPort: tendermintP2pPort
      ? tendermintP2pPort + 1
      : await getPort({ port: getPort.makeRange(37001, 38000) }),
    forgeGrpcPort: forgeGrpcPort
      ? forgeGrpcPort + 1
      : await getPort({ port: getPort.makeRange(28210, 28300) }),
    workshopPort: workshopPort
      ? workshopPort + 1
      : await getPort({ port: getPort.makeRange(8807, 8900) }),
  };

  return res;
}

async function setConfig(
  configs,
  chainName,
  {
    forgeWebPort,
    forgeGrpcPort,
    tendermintRpcPort,
    tendermintGrpcPort,
    tendermintP2pPort,
    workshopPort,
    currentVersion,
  }
) {
  const moderator = getModerator();
  let content = JSON.parse(JSON.stringify(configs));
  const internalIpV4 = (await internalIp.v4()) || '127.0.0.1';

  set(content, 'forge.web.port', forgeWebPort);
  set(content, 'forge.sock_grpc', `tcp://127.0.0.1:${forgeGrpcPort}`);
  set(content, 'tendermint.sock_rpc', `tcp://127.0.0.1:${tendermintRpcPort}`);
  set(content, 'tendermint.sock_grpc', `tcp://127.0.0.1:${tendermintGrpcPort}`);
  set(content, 'tendermint.sock_p2p', `tcp://0.0.0.0:${tendermintP2pPort}`);

  const workshopConfig = {
    host: internalIpV4,
    schema: 'http',
    port: workshopPort,
    local_forge: `tcp://127.0.0.1:${forgeGrpcPort}`,
    hyjal: {
      chain: {
        host: `http://${internalIpV4}:${forgeWebPort}/api/`,
      },
    },
  };
  set(content, 'workshop', workshopConfig);

  if (moderator) {
    const tmp = Object.assign({}, moderator);
    let moderatorKey = 'forge.moderator';

    if (semver.gte(currentVersion, '0.38.0')) {
      tmp.balance = 0;
      moderatorKey = 'forge.prime.moderator';
    }

    set(content, moderatorKey, tmp);
  }

  content = setFilePathOfConfig(content, chainName);

  return content;
}

function setFilePathOfConfig(configs, chainName) {
  const content = JSON.parse(JSON.stringify(configs));
  const releaseDirectory = getDataDirectory(chainName);

  set(content, 'forge.path', path.join(releaseDirectory, 'core'));
  set(content, 'tendermint.keypath', path.join(getChainDirectory(chainName), 'keys'));
  set(content, 'tendermint.path', path.join(releaseDirectory, 'tendermint'));

  set(content, 'cache.path', path.join(releaseDirectory, 'cache', 'mnesia_data_dir'));

  set(content, 'workshop.path', getChainWorkshopDirectory(chainName));
  set(content, 'workshop.db', 'sqlite://workshop.sqlite3');

  return content;
}

async function setConfigToChain(configs, chainName, currentVersion) {
  const {
    forgeWebPort,
    forgeGrpcPort,
    tendermintRpcPort,
    tendermintGrpcPort,
    tendermintP2pPort,
    workshopPort,
  } = await getAvailablePort();

  const tmpConfigs = await setConfig(configs, chainName, {
    forgeWebPort,
    forgeGrpcPort,
    tendermintRpcPort,
    tendermintGrpcPort,
    tendermintP2pPort,
    workshopPort,
    currentVersion,
  });

  return tmpConfigs;
}

/**
 * Get `default` chain's configs;
 * Include forge web port, forge grpc port and some config path.
 * @param {*} configs origin configs
 */
async function getDefaultChainConfigs(configs, currentVersion) {
  const forgeWebPort = await getFreePort(
    makeRange(DEFAULT_FORGE_WEB_PORT, DEFAULT_FORGE_WEB_PORT + 30)
  );

  const forgeGrpcPort = await getFreePort(
    makeRange(DEFAULT_FORGE_GRPC_PORT, DEFAULT_FORGE_GRPC_PORT + 30)
  );

  const workshopPort = await getFreePort(
    makeRange(DEFAULT_WORKSHOP_PORT, DEFAULT_WORKSHOP_PORT + 30)
  );

  if (forgeWebPort < 0 || forgeGrpcPort < 0 || workshopPort < 0) {
    throw new Error('Can not find free port');
  }

  const tendermintRpcPort = await getPort({ port: getPort.makeRange(22001, 24000) });
  const tendermintGrpcPort = await getPort({ port: getPort.makeRange(26001, 27000) });
  const tendermintP2pPort = await getPort({ port: getPort.makeRange(27001, 28000) });

  const tmpConfigs = await setConfig(configs, DEFAULT_CHAIN_NAME, {
    forgeWebPort,
    forgeGrpcPort,
    tendermintRpcPort,
    tendermintGrpcPort,
    tendermintP2pPort,
    workshopPort,
    currentVersion,
  });

  return tmpConfigs;
}

/**
 * Ensure we have a forge release to work with, in which we find forge bin
 *
 * TODO: Do one thing, do it better.
 * @param {boolean} [exitOn404=true]
 * @param {string} [chainName=process.env.FORGE_CURRENT_CHAIN]
 * @returns
 */
async function ensureForgeRelease({
  exitOn404 = true,
  chainName = process.env.FORGE_CURRENT_CHAIN,
  allowMultiChain,
}) {
  const cliConfig = {
    chainRoot: getChainDirectory(chainName),
    chainConfig: getChainReleaseFilePath(chainName),
  };

  const cliReleaseDir = REQUIRED_DIRS.release;
  if (await hasReleases()) {
    try {
      // Read global release version
      const releaseYamlPath = path.join(cliReleaseDir, './forge/release.yml');
      if (!fs.existsSync(releaseYamlPath)) {
        const localLatestVersion = (await getLocalVersions()).pop();
        applyForgeVersion(localLatestVersion);
      }

      const curVersion = getForgeVersionFromYaml(releaseYamlPath, 'current');

      if (!semver.valid(curVersion)) {
        throw new Error(`Valid version field not found in release config ${releaseYamlPath}`);
      }
      cliConfig.globalVersion = curVersion;

      // Read chain-wise version
      const chainConfigPath = getChainConfigPath(chainName);
      const currentVersion = getForgeVersionFromYaml(chainConfigPath, 'version');
      if (semver.valid(currentVersion)) {
        cliConfig.currentVersion = currentVersion;

        // FIXME: make this work
        // cliConfig.configPath = getForgeVersionFromYaml(chainConfigPath, 'config');
        debug('ensureForgeRelease.readChainConfig', chainConfigPath);
      } else {
        // Write chain-wise config to use global version
        cliConfig.currentVersion = cliConfig.globalVersion;
        // updateChainConfig(chainName, { version: cliConfig.globalVersion });
      }
    } catch (err) {
      printError(err);
      process.exit(1);
    }

    // simulator
    // eslint-disable-next-line prefer-destructuring
    const currentVersion = cliConfig.currentVersion;
    const simulatorBinPath = path.join(
      cliReleaseDir,
      'simulator',
      currentVersion,
      './bin/simulator'
    );
    if (fs.existsSync(simulatorBinPath) && fs.statSync(simulatorBinPath).isFile()) {
      debug(`${symbols.success} Using simulator executable: ${simulatorBinPath}`);
      cliConfig.simulatorBinPath = simulatorBinPath;
    }

    // only single chain mode need forge_starter
    if (allowMultiChain === false) {
      const starterBinPath = path.join(
        cliReleaseDir,
        'forge_starter',
        currentVersion,
        './bin/forge_starter'
      );
      if (fs.existsSync(starterBinPath) && fs.statSync(starterBinPath).isFile()) {
        debug(`${symbols.success} Using forge_starter executable: ${starterBinPath}`);
        cliConfig.starterBinPath = starterBinPath;
      } else {
        if (exitOn404) {
          printError(
            `forge_starter binary not found, please run ${chalk.cyan('forge install')} first`
          );
          process.exit(1);
        }
        return cliConfig;
      }
    }

    // forge_web
    const webBinPath = path.join(cliReleaseDir, 'forge_web', currentVersion, './bin/forge_web');
    if (fs.existsSync(webBinPath) && fs.statSync(webBinPath).isFile()) {
      debug(`${symbols.success} Using forge_web executable: ${webBinPath}`);
      cliConfig.webBinPath = webBinPath;
    }

    // forge_workshop
    const workshopBinPath = path.join(
      cliReleaseDir,
      'forge_workshop',
      currentVersion,
      './bin/forge_workshop'
    );
    if (fs.existsSync(workshopBinPath) && fs.statSync(workshopBinPath).isFile()) {
      debug(`${symbols.success} Using forge_web executable: ${workshopBinPath}`);
      cliConfig.workshopBinPath = workshopBinPath;
    }

    // forge_kernel
    const forgeBinPath = path.join(cliReleaseDir, 'forge', currentVersion, './bin/forge');
    const tmPath = `lib/consensus-${currentVersion}/priv/tendermint/tendermint`;
    const tmBinPath = path.join(cliReleaseDir, 'forge', currentVersion, tmPath);
    if (fs.existsSync(forgeBinPath) && fs.statSync(forgeBinPath).isFile()) {
      cliConfig.releaseDir = cliReleaseDir;
      cliConfig.forgeBinPath = forgeBinPath;
      cliConfig.tmBinPath = tmBinPath;
      cliConfig.forgeReleaseDir = path.join(cliReleaseDir, 'forge');
      debug(`${symbols.success} Using forge release dir: ${cliReleaseDir}`);
      debug(`${symbols.success} Using forge executable: ${forgeBinPath}`);

      if (checkSatisfiedForgeVersion(currentVersion, engines.forge)) {
        return cliConfig;
      }

      if (exitOn404) {
        printError(
          `forge-cli@${version} requires forge@${engines.forge} to work, but got ${currentVersion}!`
        );
        printInfo(`if you want to use forge-cli@${version}, please following below steps:`);
        print(hr);
        print(`1. run ${chalk.cyan('ps aux | grep forge')}, and kill all forge related processes`);
        print(`2. cleanup forge release dir: ${chalk.cyan('rm -rf ~/.forge_chains')}`);
        print(`3. cleanup forge cli dir: ${chalk.cyan('rm -rf ~/.forge_cli')}`);
        print(`4. install latest forge: ${chalk.cyan('forge install')}`);
        print(`5. start latest forge: ${chalk.cyan('forge start')}`);
        process.exit(1);
      }
    } else if (exitOn404) {
      printError(`forge release binary not found, please run ${chalk.cyan('forge install')} first`);
      process.exit(1);
    }
  } else if (exitOn404) {
    printError(`Forge releases not found.

  You can either run ${chalk.cyan('forge install')} to get the latest forge release.
  Or start node with custom forge release folder:
  > ${chalk.cyan('forge start --release-dir ~/Downloads/forge/')}
  > ${chalk.cyan('FORGE_RELEASE_DIR=~/Downloads/forge/ forge start')}
      `);
    process.exit(1);
  }

  return cliConfig;
}

module.exports = {
  ensureForgeRelease,
  getDefaultChainConfigs,
  setConfigToChain,
  setFilePathOfConfig,
};
