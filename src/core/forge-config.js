const chalk = require('chalk');
const fs = require('fs');
const semver = require('semver');
const path = require('path');
const { get, set } = require('lodash');
const TOML = require('@iarna/toml');

const {
  DEFAULT_CHAIN_NAME,
  DEFAULT_FORGE_WEB_PORT,
  DEFAULT_WORKSHOP_PORT,
  DEFAULT_FORGE_GRPC_PORT,
} = require('../constant');
const {
  getAllAppDirectories,
  getDataDirectory,
  getRootConfigDirectory,
  getCurrentReleaseFilePath,
  getOriginForgeReleaseFilePath,
  getForgeVersionFromYaml,
  getChainConfigPath,
  getProfileWorkshopDirectory,
  getProfileDirectory,
  getProfileReleaseFilePath,
  updateChainConfig,
  requiredDirs,
} = require('./forge-fs');
const {
  makeRange,
  getPort,
  getFreePort,
  print,
  printError,
  printInfo,
  printSuccess,
} = require('./util');
const { hr, symbols } = require('./ui');
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
    if (tmp === `forge_${DEFAULT_CHAIN_NAME}`) {
      return;
    }

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
      : await getPort({ port: getPort.makeRange(8211, 8300) }),
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
      : await getPort({ port: getPort.makeRange(38210, 38300) }),
    workshopPort: workshopPort
      ? workshopPort + 1
      : await getPort({ port: getPort.makeRange(8807, 8900) }),
  };

  return res;
}

function setConfig(
  configs,
  chainName,
  {
    forgeWebPort,
    forgeGrpcPort,
    tendermintRpcPort,
    tendermintGrpcPort,
    tendermintP2pPort,
    workshopPort,
  }
) {
  let content = JSON.parse(JSON.stringify(configs));

  set(content, 'forge.web.port', forgeWebPort);
  set(content, 'forge.sock_grpc', `tcp://127.0.0.1:${forgeGrpcPort}`);
  set(content, 'tendermint.sock_rpc', `tcp://127.0.0.1:${tendermintRpcPort}`);
  set(content, 'tendermint.sock_grpc', `tcp://127.0.0.1:${tendermintGrpcPort}`);
  set(content, 'tendermint.sock_p2p', `tcp://0.0.0.0:${tendermintP2pPort}`);
  set(content, 'workshop.port', workshopPort);
  set(content, 'workshop.local_forge', `tcp://127.0.0.1:${forgeGrpcPort}`);

  content = setFilePathOfConfig(content, chainName);

  return content;
}

function setFilePathOfConfig(configs, chainName) {
  const content = JSON.parse(JSON.stringify(configs));
  const releaseDirectory = getDataDirectory(chainName);

  set(content, 'forge.path', path.join(releaseDirectory, 'core'));
  set(content, 'tendermint.keypath', path.join(getProfileDirectory(chainName), 'keys'));
  set(content, 'tendermint.path', path.join(releaseDirectory, 'tendermint'));

  set(content, 'ipfs.path', path.join(releaseDirectory, 'ipfs'));
  set(content, 'cache.path', path.join(releaseDirectory, 'cache', 'mnesia_data_dir'));

  set(content, 'workshop.path', getProfileWorkshopDirectory(chainName));
  set(content, 'workshop.db', 'sqlite://workshop.sqlite3');

  return content;
}

async function setConfigToProfile(configs, chainName) {
  const {
    forgeWebPort,
    forgeGrpcPort,
    tendermintRpcPort,
    tendermintGrpcPort,
    tendermintP2pPort,
    workshopPort,
  } = await getAvailablePort();

  return setConfig(configs, chainName, {
    forgeWebPort,
    forgeGrpcPort,
    tendermintRpcPort,
    tendermintGrpcPort,
    tendermintP2pPort,
    workshopPort,
  });
}

/**
 * Get `default` chain's configs;
 * Include forge web port, forge grpc port and some config path.
 * @param {*} configs origin configs
 */
async function getDefaultChainConfigs(configs) {
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

  return setConfig(configs, DEFAULT_CHAIN_NAME, {
    forgeWebPort,
    forgeGrpcPort,
    tendermintRpcPort,
    tendermintGrpcPort,
    tendermintP2pPort,
    workshopPort,
  });
}

async function copyReleaseConfig(currentVersion, overwrite = true) {
  const targetPath = getCurrentReleaseFilePath();
  if (fs.existsSync(targetPath) && !overwrite) {
    return;
  }

  const sourcePath = getOriginForgeReleaseFilePath(currentVersion);

  if (!sourcePath) {
    printError('Forge config not found under release folder');
    process.exit(1);
  }

  printSuccess(`Extract forge config from ${sourcePath}`);
  let content = fs.readFileSync(sourcePath);
  content = await getDefaultChainConfigs(TOML.parse(content.toString()));
  fs.writeFileSync(targetPath, TOML.stringify(content));

  printSuccess(`Forge config written to ${targetPath}`);
}

/**
 * Ensure we have a forge release to work with, in which we find forge bin
 *
 * @param {*} args
 * @param {boolean} [exitOn404=true]
 * @returns
 */
async function ensureForgeRelease(
  args,
  exitOn404 = true,
  chainName = process.env.FORGE_CURRENT_CHAIN
) {
  const cliConfig = {};
  const cliReleaseDir = requiredDirs.release;

  const envReleaseDir = process.env.FORGE_RELEASE_DIR; // deprecated?
  const argReleaseDir = args.releaseDir; // deprecated?
  if (envReleaseDir || argReleaseDir) {
    printInfo(`${chalk.yellow(`Using custom release dir: ${envReleaseDir || argReleaseDir}`)}`);
  }

  const releaseDir = argReleaseDir || envReleaseDir || cliReleaseDir;
  const releaseYamlPath = path.join(releaseDir, './forge/release.yml');
  if (fs.existsSync(releaseDir)) {
    // Try use chain-wise-version
    try {
      const chainConfigPath = getChainConfigPath(chainName);
      const currentVersion = getForgeVersionFromYaml(chainConfigPath, 'version');
      if (semver.valid(currentVersion)) {
        cliConfig.currentVersion = currentVersion;

        // FIXME: this should work out of box
        // cliConfig.configPath = getForgeVersionFromYaml(chainConfigPath, 'config');

        debug('ensureForgeRelease.readChainConfig', chainConfigPath);
      } else {
        // Then use global release version
        const curVersion = getForgeVersionFromYaml(releaseYamlPath, 'current');
        if (!semver.valid(curVersion)) {
          throw new Error(`no valid version field found in release config ${releaseYamlPath}`);
        }
        cliConfig.currentVersion = curVersion;

        // Then write chain-wise config to use global version
        updateChainConfig(chainName, { version: cliConfig.currentVersion });
      }
    } catch (err) {
      debug.error('ensureForgeRelease.readConfig.error', err);
      if (exitOn404) {
        printError(`config file ${releaseYamlPath} invalid`);
        process.exit(1);
      }

      return false;
    }

    // simulator
    // eslint-disable-next-line prefer-destructuring
    const currentVersion = cliConfig.currentVersion;
    const simulatorBinPath = path.join(releaseDir, 'simulator', currentVersion, './bin/simulator');
    if (fs.existsSync(simulatorBinPath) && fs.statSync(simulatorBinPath).isFile()) {
      debug(`${symbols.success} Using simulator executable: ${simulatorBinPath}`);
      cliConfig.simulatorBinPath = simulatorBinPath;
    }

    // forge_web
    const webBinPath = path.join(releaseDir, 'forge_web', currentVersion, './bin/forge_web');
    if (fs.existsSync(webBinPath) && fs.statSync(webBinPath).isFile()) {
      debug(`${symbols.success} Using forge_web executable: ${webBinPath}`);
      cliConfig.webBinPath = webBinPath;
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
      cliConfig.workshopBinPath = workshopBinPath;
    }

    // forge_kernel
    const forgeBinPath = path.join(releaseDir, 'forge', currentVersion, './bin/forge');
    if (fs.existsSync(forgeBinPath) && fs.statSync(forgeBinPath).isFile()) {
      cliConfig.releaseDir = releaseDir;
      cliConfig.forgeBinPath = forgeBinPath;
      cliConfig.forgeReleaseDir = path.join(releaseDir, 'forge');
      debug(`${symbols.success} Using forge release dir: ${releaseDir}`);
      debug(`${symbols.success} Using forge executable: ${forgeBinPath}`);

      if (semver.satisfies(currentVersion, engines.forge)) {
        if (process.env.FORGE_CURRENT_CHAIN === DEFAULT_CHAIN_NAME) {
          await copyReleaseConfig(currentVersion, false);
        }

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
    printError(`forge release dir does not exist

  You can either run ${chalk.cyan('forge install')} to get the latest forge release.
  Or start node with custom forge release folder
  > ${chalk.cyan('forge start --release-dir ~/Downloads/forge/')}
  > ${chalk.cyan('FORGE_RELEASE_DIR=~/Downloads/forge/ forge start')}
      `);
    process.exit(1);
  }

  return cliConfig;
}

function readChainConfig(chainName) {
  return TOML.parse(fs.readFileSync(getProfileReleaseFilePath(chainName)).toString());
}

module.exports = {
  copyReleaseConfig,
  ensureForgeRelease,
  getDefaultChainConfigs,
  setConfigToProfile,
  setFilePathOfConfig,
  readChainConfig,
};
