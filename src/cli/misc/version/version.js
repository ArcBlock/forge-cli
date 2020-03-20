const chalk = require('chalk');
const os = require('os');
const shell = require('shelljs');

const { runNativeWebCommand, runNativeSimulatorCommand } = require('core/env');
const debug = require('core/debug')('version');
const { print } = require('core/util');
const { getConsensusEnginBinPath, getGlobalForgeVersion } = require('core/forge-fs');
const { getChainVersion, makeNativeCommand } = require('core/libs/common');

const { SHIFT_WIDTH } = require('../../../constant');
const { version: forgeCliVersion } = require('../../../../package.json');

const getVersion = handler => {
  const { code, stdout, stderr } = handler('version', { silent: true })();
  if (code !== 0) {
    debug(`${handler} version error: ${stderr.trim()}`);
    return '';
  }

  return stdout.trim();
};

const getConsenseVersion = currentVersion => {
  const consensusEnginePath = getConsensusEnginBinPath(currentVersion);
  if (consensusEnginePath) {
    const command = makeNativeCommand({
      binPath: consensusEnginePath,
      subcommand: 'version',
    });

    const { code, stdout, stderr } = shell.exec(command, { silent: true });
    if (code === 0) {
      const consensusVersion = stdout.trim();
      return `tendermint ${consensusVersion}`;
    }

    debug('consensus version error:', stderr);
    return '';
  }

  return '';
};

const printVersion = async chainName => {
  const currentVersion = getChainVersion(chainName);

  if (!currentVersion) {
    throw new Error(`Invalid chain version, chain: ${chainName}`);
  }

  // components
  const forgeWebVersion = getVersion(runNativeWebCommand);
  const simulatorVersion = getVersion(runNativeSimulatorCommand);
  const consensusVersion = getConsenseVersion(currentVersion);

  const versions = [
    `forge_core ${currentVersion}`,
    consensusVersion,
    forgeWebVersion,
    simulatorVersion,
  ].filter(Boolean);

  print(`Forge components of ${chainName} chain:`);
  versions.sort().forEach(item => print(`${SHIFT_WIDTH}- ${item}`));

  print();
};

const printOSInformation = () => {
  print(`OS: ${os.type()} kernel ${os.release()}; ${os.arch()}`);
};

async function main({ opts: { chainName } }) {
  print();
  if (chainName) {
    await printVersion(chainName);
  }

  print(`Forge CLI: ${forgeCliVersion}`);
  print(`Global forge: ${getGlobalForgeVersion()}`);
  await printOSInformation();
  print();
  print(
    `If you want to check other chain's version info, please run: ${chalk.cyan(
      'forge version [chainName]'
    )}`
  );
}

exports.run = main;
exports.execute = main;
exports.printVersion = printVersion;
