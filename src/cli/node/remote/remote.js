const path = require('path');
const shelljs = require('shelljs');
const childProcess = require('child_process');
const { config } = require('core/env');
const debug = require('core/debug')('remote');
const {
  getForgeReleaseDirectory,
  getForgeSimulatorReleaseDirectory,
  getForgeWebReleaseDirectory,
} = require('core/forge-fs');
const { getProcessTag } = require('core/forge-process');
const { printError } = require('core/util');

const getAppReleaseDirectory = {
  forge: getForgeReleaseDirectory,
  web: getForgeWebReleaseDirectory,
  simulator: getForgeSimulatorReleaseDirectory,
};

async function main({
  args: [appName = 'forge'],
  opts: { chainName = process.env.FORGE_CURRENT_CHAIN, allowMultiChain },
}) {
  const currentVersion = config.get('cli.currentVersion');
  const handler = getAppReleaseDirectory[appName];
  if (!handler) {
    printError(`${appName} is not supported`);
    process.exit(1);
  }

  const releaseDirectory = handler(currentVersion);
  const binDirectory = path.join(releaseDirectory, 'releases', currentVersion);

  const cookieFilePath = path.join(releaseDirectory, 'releases', 'COOKIE');

  const iexBinPath = path.join(binDirectory, 'iex');
  const params = `
  --hidden
  --boot start_clean
  --boot-var RELEASE_LIB .
  --sname forge-${Date.now()}
  --remsh ${getProcessTag(appName, chainName, allowMultiChain)}
  --cookie ${shelljs.cat(cookieFilePath)}`
    .split(/\s+/)
    .filter(Boolean);

  debug(iexBinPath);
  debug(params);

  childProcess.execFileSync(iexBinPath, params, { stdio: 'inherit', cwd: binDirectory });
}

exports.run = main;
exports.execute = main;
