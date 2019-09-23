/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
const chalk = require('chalk');
const fs = require('fs');
const inquirer = require('inquirer');
const { spawn } = require('child_process');
const { print, printError, printInfo, printSuccess } = require('core/util');
const { getPlatform } = require('core/env');
const { getAllChainNames, updateReleaseYaml } = require('core/forge-fs');
const { isForgeStarted } = require('core/forge-process');
const { formatVersion, downloadForge, DOWNLOAD_FLAGS } = require('../../release/download/lib');

const { DEFAULT_MIRROR, RELEASE_ASSETS } = require('../../../constant');

async function main({
  args: [userVersion],
  opts: { mirror = DEFAULT_MIRROR, allowMultiChain, releaseDir, silent, force = false },
}) {
  try {
    const platform = await getPlatform();
    printInfo(`Detected platform is: ${platform}`);
    if (mirror && mirror !== DEFAULT_MIRROR) {
      printInfo(`${chalk.yellow(`Using custom mirror: ${mirror}`)}`);
    }

    if (releaseDir && fs.existsSync(releaseDir)) {
      printInfo(`${chalk.yellow(`Using local releaseDir: ${releaseDir}`)}`);
    }

    // Ensure forge is stopped, because init on an running node may cause some mess
    if (allowMultiChain === false) {
      const isStarted = await isForgeStarted();
      if (isStarted) {
        printError('Forge is running, install will break things!');
        printInfo(`To install a new forge release, please run ${chalk.cyan('forge stop')} first!`);
        return process.exit(1);
      }
    }

    const { version, isLatest } = formatVersion({ version: userVersion, mirror, releaseDir });
    const downloadResult = await downloadForge({
      version,
      mirror,
      releaseDir,
      platform,
      whitelistAssets: RELEASE_ASSETS,
      force,
      isLatest,
    });

    if (downloadResult !== DOWNLOAD_FLAGS.SUCCESS) {
      process.exit(1);
    }

    updateReleaseYaml('forge', version);
    updateReleaseYaml('simulator', version);

    printSuccess(`Congratulations! forge v${version} installed successfully!`);
    print();

    if (!silent) {
      const chainsCount = getAllChainNames().length;
      if (chainsCount > 0) {
        printInfo(`If you want to custom the config, run: ${chalk.cyan('forge config set')}`);
        process.exit(0);
      }

      const questions = [
        {
          type: 'confirm',
          name: 'customizeConfig',
          message: 'Do you want to customize config for this chain?',
          default: true,
        },
      ];
      const { customizeConfig } = await inquirer.prompt(questions);

      if (customizeConfig) {
        const childProcess = spawn('forge', ['config', 'set'], {
          stdio: 'inherit',
          env: process.env,
          cwd: process.cwd(),
        });

        childProcess.on('close', () => {
          print();
          print(`Configured! Now you can start a forge node with ${chalk.cyan('forge start')}`);
          print();
          process.exit(0);
        });

        return;
      }
    }
    print(`Now you can start a forge node with ${chalk.cyan('forge start')}`);
    print();
  } catch (err) {
    printError(err);
    printError('Forge initialize failed, please try again later');
  }
}

exports.run = main;
exports.execute = main;
