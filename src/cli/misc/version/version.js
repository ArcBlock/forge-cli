const chalk = require('chalk');
const os = require('os');
const shell = require('shelljs');

const {
  config,
  runNativeWebCommand,
  runNativeSimulatorCommand,
  runNativeWorkshopCommand,
} = require('core/env');
const debug = require('core/debug')('version');
const { print } = require('core/util');
const { getConsensusEnginBinPath } = require('core/forge-fs');
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
      const { consensusEngine = 'tendermint' } = config.get('forge');
      return `${consensusEngine} ${consensusVersion}`;
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
  const workshopVersion = getVersion(runNativeWorkshopCommand);
  const consensusVersion = getConsenseVersion(currentVersion);

  const versions = [
    `forge_core ${currentVersion}`,
    consensusVersion,
    `forge_cli ${forgeCliVersion}`,
    forgeWebVersion,
    simulatorVersion,
    workshopVersion,
  ].filter(Boolean);

  print();
  print('Forge components:');
  versions.forEach(item => print(`${SHIFT_WIDTH}- ${item}`));

  print();
};

const printOSInformation = () => {
  print('OS:');
  print(`${SHIFT_WIDTH}${os.type()} kernel ${os.release()}; ${os.arch()}`);
  print();
};

async function main({ opts: { chainName } }) {
  await printVersion(chainName);
  await printOSInformation();

  print(
    `If you want to check other chain's version info, please run: ${chalk.cyan(
      'forge version [chainName]'
    )}`
  );
}

exports.run = main;
exports.execute = main;
exports.printVersion = printVersion;
