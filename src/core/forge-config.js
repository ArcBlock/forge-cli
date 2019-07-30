const fs = require('fs');
const path = require('path');
const getPort = require('get-port');
const { get, set } = require('lodash');
const TOML = require('@iarna/toml');

const { getReleaseDirectory, getRootConfigDirectory, isDirectory } = require('./forge-fs');

function getAllAppDirectories() {
  const rootConfigDirectory = getRootConfigDirectory();

  return fs
    .readdirSync(rootConfigDirectory)
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

async function getAllUsedPorts() {
  const configDirectories = getAllAppDirectories();

  const maxPortPerField = {
    forgeWebPort: 0,
    forgeGrpcPort: 0,
    tendminRpcPort: 0,
    tendmintGrpcPort: 0,
    tendmintP2pPort: 0,
  };

  configDirectories.forEach(dir => {
    const cfg = TOML.parse(fs.readFileSync(path.join(dir, 'forge_release.toml')).toString());

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
  } = await getAllUsedPorts();

  const res = {
    forgeWebPort: forgeWebPort
      ? forgeWebPort + 1
      : await getPort({ port: getPort.makeRange(28001, 30000) }),
    forgeGrpcPort: forgeGrpcPort
      ? forgeGrpcPort + 1
      : await getPort({ port: getPort.makeRange(20000, 22000) }),
    tendminRpcPort: tendminRpcPort
      ? tendminRpcPort + 1
      : await getPort({ port: getPort.makeRange(22001, 24000) }),
    tendmintGrpcPort: tendmintGrpcPort
      ? tendmintGrpcPort + 1
      : await getPort({ port: getPort.makeRange(26001, 27000) }),
    tendmintP2pPort: tendmintP2pPort
      ? tendmintP2pPort + 1
      : await getPort({ port: getPort.makeRange(27001, 28000) }),
  };

  return res;
}

async function setConfigToProfile(configs, appName) {
  const content = JSON.parse(JSON.stringify(configs));

  const {
    forgeWebPort,
    forgeGrpcPort,
    tendminRpcPort,
    tendmintGrpcPort,
    tendmintP2pPort,
  } = await getAvailablePort();

  set(content, 'forge.web.port', forgeWebPort);
  set(content, 'forge.path', path.join(getReleaseDirectory(appName), 'core'));
  set(content, 'tendermint.keypath', path.join(getReleaseDirectory(appName), 'keys'));
  set(content, 'tendermint.path', path.join(getReleaseDirectory(appName), 'tendermint'));
  set(content, 'forge.sock_grpc', `tcp://127.0.0.1:${forgeGrpcPort}`);
  set(content, 'tendermint.sock_rpc', `tcp://127.0.0.1:${tendminRpcPort}`);
  set(content, 'tendermint.sock_grpc', `tcp://127.0.0.1:${tendmintGrpcPort}`);
  set(content, 'tendermint.sock_p2p', `tcp://0.0.0.0:${tendmintP2pPort}`);

  set(content, 'ipfs.path', path.join(getReleaseDirectory(appName), 'ipfs'));
  set(content, 'cache.path', path.join(getReleaseDirectory(appName), 'cache', 'mnesia_data_dir'));

  return content;
}

module.exports = { setConfigToProfile, getAllAppNames };
