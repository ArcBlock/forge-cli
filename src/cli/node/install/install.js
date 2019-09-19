/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const os = require('os');
const shell = require('shelljs');
const semver = require('semver');
const tar = require('tar');
const inquirer = require('inquirer');
const { spawn } = require('child_process');
const { symbols, hr, getSpinner, getProgress } = require('core/ui');
const { print, printError, printInfo, printSuccess } = require('core/util');
const { debug, getPlatform } = require('core/env');
const { printLogo } = require('core/util');
const {
  getGlobalForgeVersion,
  getAllChainNames,
  updateReleaseYaml,
  isReleaseBinExists,
} = require('core/forge-fs');
const { isForgeStarted } = require('core/forge-process');

const { DEFAULT_MIRROR, RELEASE_ASSETS, REQUIRED_DIRS } = require('../../../constant');

function fetchReleaseVersion({ mirror, releaseDir }) {
  if (releaseDir && fs.existsSync(releaseDir)) {
    const versions = fs
      .readdirSync(releaseDir)
      .filter(x => semver.valid(x))
      .sort((a, b) => {
        if (semver.gt(a, b)) {
          return -1;
        }
        if (semver.lt(b, a)) {
          return 1;
        }

        return 0;
      });

    if (versions.length) {
      printSuccess(`Latest forge release version: v${versions[0]}`);
      return versions[0];
    }
  }

  const spinner = getSpinner('Fetching forge release version...');
  spinner.start();

  try {
    const url = `${mirror}/forge/latest.json`;
    const { code, stdout, stderr } = shell.exec(`curl "${url}"`, { silent: true });
    // debug('fetchReleaseVersion', { code, stdout, stderr, url });
    if (code === 0) {
      const { latest: version } = JSON.parse(stdout.trim()) || {};
      spinner.succeed(`Latest forge release version: v${version}`);
      return version;
    }
    spinner.fail(`Release version fetch error: ${stderr}`);
  } catch (err) {
    spinner.fail(`Release version fetch error: ${err.message}`);
  }

  process.exit(1);
}

function getAssetInfo({ platform, version, key, mirror, releaseDir }) {
  const name = `${key}_${platform}_amd64.tgz`;

  if (releaseDir) {
    const assetPath = path.join(releaseDir, version, name);
    if (fs.existsSync(assetPath)) {
      printSuccess(`Release asset find ${assetPath}`);
      return { name, url: assetPath };
    }
  }

  const url = `${mirror}/forge/${version}/${name}`;

  return { url, name };
}

/**
 *
 * @param {array} assets to be downloaded assets
 * @param {object} download meta info
 */
async function downloadAssets(assets, { platform, version, mirror, releaseDir }) {
  const downloadFailedQueue = [];

  // Start download and unzip
  for (const asset of assets) {
    try {
      const assetInfo = getAssetInfo({ platform, version, key: asset, mirror, releaseDir });
      // eslint-disable-next-line no-await-in-loop
      const assetTarball = await download(assetInfo);
      // eslint-disable-next-line no-await-in-loop
      await expandReleaseTarball(assetTarball, asset, version);
      fsExtra.removeSync(assetTarball);
    } catch (error) {
      printError(error);
      downloadFailedQueue.push(asset);
    }
  }

  if (downloadFailedQueue.length > 0) {
    print();
    printError('Failed to download:');
    downloadFailedQueue.forEach(x => printInfo(x));
    return false;
  }

  return true;
}

function download(assetInfo) {
  return new Promise((resolve, reject) => {
    debug('Download asset', assetInfo.url);

    const assetDest = path.join(os.tmpdir(), assetInfo.name);
    if (fs.existsSync(assetDest)) {
      shell.rm(assetDest);
    }

    if (fs.existsSync(assetInfo.url)) {
      fsExtra.copySync(assetInfo.url, assetDest);
      printSuccess(`Copied release asset ${assetInfo.url}`);
      return resolve(assetDest);
    }

    printInfo(`Start download ${assetInfo.url}`);

    axios
      .get(assetInfo.url, {
        responseType: 'stream',
      })
      .then(response => {
        const progress = getProgress({
          title: `${symbols.info} Downloading ${assetInfo.name}`,
          unit: 'MB',
        });

        const totalSize = Number(response.headers['content-length']);
        const bufferArray = [];
        progress.start((totalSize / 1024 / 1024).toFixed(2), 0);

        let downloadedLength = 0;
        response.data.on('data', data => {
          bufferArray.push(data);
          downloadedLength += Buffer.byteLength(data);
          progress.update((downloadedLength / 1024 / 1024).toFixed(2));
        });

        response.data.on('end', () => {
          if (!response.data.complete) {
            return reject(new Error('download incomplete'));
          }

          const buffer = Buffer.concat(bufferArray);
          fs.writeFileSync(assetDest, buffer);
          debug(`${assetInfo.name} download success: ${assetDest}`);
          progress.stop();
          return resolve(assetDest);
        });

        response.data.on('error', err => {
          progress.stop();
          reject(err);
        });
      })
      .catch(reject);
  });
}

async function expandReleaseTarball(filePath, subFolder, version) {
  const targetDir = path.join(REQUIRED_DIRS.release, subFolder, version);
  fsExtra.removeSync(targetDir);
  fs.mkdirSync(targetDir, { recursive: true });
  await tar.x({ file: filePath, C: targetDir, strip: 1 });
  debug(`Expand release asset ${filePath} to ${targetDir}`);
}

async function main({
  args: [userVersion],
  opts: { mirror = DEFAULT_MIRROR, allowMultiChain, releaseDir, silent },
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

    const userVer = semver.coerce(userVersion) ? semver.coerce(userVersion).version : '';
    const version = userVer || fetchReleaseVersion({ mirror, releaseDir });

    const currentVersion = getGlobalForgeVersion();
    const unDownloadAssets = RELEASE_ASSETS.filter(x => !isReleaseBinExists(x, version));

    if (unDownloadAssets.length === 0) {
      printInfo(`forge v${version} is already installed`);

      if (semver.eq(version, currentVersion)) {
        shell.echo(hr);
        shell.echo(chalk.cyan('Current forge release'));
        shell.echo(hr);
        shell.exec('forge version');
      }

      return process.exit(0);
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

    printLogo();

    const isSuccess = await downloadAssets(unDownloadAssets, {
      platform,
      version,
      mirror,
      releaseDir,
    });

    updateReleaseYaml('forge', version);
    updateReleaseYaml('simulator', version);

    if (!isSuccess) {
      printError('Please check your assets version or mirror address is correct and try again.');
      process.exit(1);
    }

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
          shell.echo('');
          shell.echo(
            `Configured! Now you can start a forge node with ${chalk.cyan('forge start')}`
          );
          shell.echo('');
          process.exit(0);
        });

        return;
      }
    }
    shell.echo(`Now you can start a forge node with ${chalk.cyan('forge start')}`);
    shell.echo('');
  } catch (err) {
    printError(err);
    printError('Forge initialize failed, please try again later');
  }
}

exports.run = main;
exports.execute = main;
exports.fetchReleaseVersion = fetchReleaseVersion;
exports.getAssetInfo = getAssetInfo;
exports.downloadAssets = downloadAssets;
exports.download = download;
exports.expandReleaseTarball = expandReleaseTarball;
