const fs = require('fs');
const path = require('path');
const { get, set } = require('lodash');
const TOML = require('@iarna/toml');

const {
  DEFAULT_CHAIN_NAME,
  DEFAULT_FORGE_WEB_PORT,
  DEFAULT_FORGE_GRPC_PORT,
} = require('../constant');
const {
  getReleaseDirectory,
  getRootConfigDirectory,
  getCurrentReleaseFilePath,
  getOriginForgeReleaseFilePath,
  isDirectory,
} = require('./forge-fs');
const { getPort, getFreePort, printSuccess, printError } = require('./util');

function getAllAppDirectories() {
  const rootConfigDirectory = getRootConfigDirectory();

  return fs
    .readdirSync(rootConfigDirectory)
    .filter(tmp => tmp.startsWith('forge'))
    .map(tmp => path.join(rootConfigDirectory, tmp))
    .filter(isDirectory);
}

function getAllAppNames() {
  return getAllAppDirectories().map(tmp => {
    const name = path.basename(tmp);
    return name.slice(name.indexOf('_') + 1);
  });
}

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
    tendminRpcPort: 0,
    tendmintGrpcPort: 0,
    tendmintP2pPort: 0,
  };

  configDirectories.forEach(dir => {
    const forgeReleasePath = path.join(dir, 'forge_release.toml');
    if (!fs.existsSync(forgeReleasePath)) {
      return;
    }

    const cfg = TOML.parse(fs.readFileSync(forgeReleasePath).toString());

    const forgeWebPort = Number(get(cfg, 'forge.web.port'));
    const forgeGrpcPort = getPortFromUri(get(cfg, 'forge.sock_grpc'));
    const tendminRpcPort = getPortFromUri(get(cfg, 'tendermint.sock_rpc'));
    const tendmintGrpcPort = getPortFromUri(get(cfg, 'tendermint.sock_grpc'));
    const tendmintP2pPort = getPortFromUri(get(cfg, 'tendermint.sock_p2p'));

    if (forgeWebPort > maxPortPerField.forgeWebPort) {
      maxPortPerField.forgeWebPort = forgeWebPort;
    }

    if (forgeGrpcPort > maxPortPerField.forgeGrpcPort) {
      maxPortPerField.forgeGrpcPort = forgeGrpcPort;
    }

    if (tendminRpcPort > maxPortPerField.tendminRpcPort) {
      maxPortPerField.tendminRpcPort = tendminRpcPort;
    }
    if (tendmintGrpcPort > maxPortPerField.tendmintGrpcPort) {
      maxPortPerField.tendmintGrpcPort = tendmintGrpcPort;
    }

    if (tendmintP2pPort > maxPortPerField.tendmintP2pPort) {
      maxPortPerField.tendmintP2pPort = tendmintP2pPort;
    }
  });

  return maxPortPerField;
}

async function getAvailablePort() {
  const {
    forgeWebPort,
    forgeGrpcPort,
    tendminRpcPort,
    tendmintGrpcPort,
    tendmintP2pPort,
  } = await getUsedPortsByForge();

  const res = {
    forgeWebPort: forgeWebPort
      ? forgeWebPort + 1
      : await getPort({ port: getPort.makeRange(8210, 8300) }),
    tendminRpcPort: tendminRpcPort
      ? tendminRpcPort + 1
      : await getPort({ port: getPort.makeRange(22001, 24000) }),
    tendmintGrpcPort: tendmintGrpcPort
      ? tendmintGrpcPort + 1
      : await getPort({ port: getPort.makeRange(26001, 27000) }),
    tendmintP2pPort: tendmintP2pPort
      ? tendmintP2pPort + 1
      : await getPort({ port: getPort.makeRange(27001, 28000) }),
    forgeGrpcPort: forgeGrpcPort
      ? forgeGrpcPort + 1
      : await getPort({ port: getPort.makeRange(28210, 28300) }),
  };

  return res;
}

function seConfig(
  configs,
  appName,
  { forgeWebPort, forgeGrpcPort, tendminRpcPort, tendmintGrpcPort, tendmintP2pPort }
) {
  const content = JSON.parse(JSON.stringify(configs));
  const releaseDirectory = getReleaseDirectory(appName);

  set(content, 'forge.path', path.join(releaseDirectory, 'core'));
  set(content, 'tendermint.keypath', path.join(releaseDirectory, 'keys'));
  set(content, 'tendermint.path', path.join(releaseDirectory, 'tendermint'));

  set(content, 'forge.web.port', forgeWebPort);
  set(content, 'forge.sock_grpc', `tcp://127.0.0.1:${forgeGrpcPort}`);
  set(content, 'tendermint.sock_rpc', `tcp://127.0.0.1:${tendminRpcPort}`);
  set(content, 'tendermint.sock_grpc', `tcp://127.0.0.1:${tendmintGrpcPort}`);
  set(content, 'tendermint.sock_p2p', `tcp://0.0.0.0:${tendmintP2pPort}`);

  set(content, 'ipfs.path', path.join(releaseDirectory, 'ipfs'));
  set(content, 'cache.path', path.join(releaseDirectory, 'cache', 'mnesia_data_dir'));

  return content;
}

async function setConfigToProfile(configs, appName) {
  const {
    forgeWebPort,
    forgeGrpcPort,
    tendminRpcPort,
    tendmintGrpcPort,
    tendmintP2pPort,
  } = await getAvailablePort();

  return seConfig(configs, appName, {
    forgeWebPort,
    forgeGrpcPort,
    tendminRpcPort,
    tendmintGrpcPort,
    tendmintP2pPort,
  });
}

/**
 * Get `default` chain's configs;
 * Include forge web port, forge grpc port and some config path.
 * @param {*} configs origin configs
 */
async function getDefaultChainConfigs(configs) {
  const forgeWebPort = await getFreePort([
    DEFAULT_FORGE_WEB_PORT,
    DEFAULT_FORGE_WEB_PORT + 1,
    DEFAULT_FORGE_WEB_PORT + 2,
    DEFAULT_FORGE_WEB_PORT + 3,
    DEFAULT_FORGE_WEB_PORT + 4,
  ]);

  const forgeGrpcPort = await getFreePort([
    DEFAULT_FORGE_GRPC_PORT,
    DEFAULT_FORGE_GRPC_PORT + 1,
    DEFAULT_FORGE_GRPC_PORT + 2,
    DEFAULT_FORGE_GRPC_PORT + 3,
    DEFAULT_FORGE_GRPC_PORT + 4,
  ]);

  if (forgeWebPort < 0 || forgeGrpcPort < 0) {
    throw new Error('Can not find free port');
  }

  const tendminRpcPort = await getPort({ port: getPort.makeRange(22001, 24000) });
  const tendmintGrpcPort = await getPort({ port: getPort.makeRange(26001, 27000) });
  const tendmintP2pPort = await getPort({ port: getPort.makeRange(27001, 28000) });

  return seConfig(configs, DEFAULT_CHAIN_NAME, {
    forgeWebPort,
    forgeGrpcPort,
    tendminRpcPort,
    tendmintGrpcPort,
    tendmintP2pPort,
  });
}

async function copyReleaseConfig(currentVersion, overwrite = true) {
  const targetPath = getCurrentReleaseFilePath();
  if (fs.existsSync(targetPath) && !overwrite) {
    return;
  }

  const sourcePath = getOriginForgeReleaseFilePath('forge', currentVersion);

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

module.exports = { setConfigToProfile, getAllAppNames, getDefaultChainConfigs, copyReleaseConfig };
