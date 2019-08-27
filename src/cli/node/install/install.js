/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const chalk = require('chalk');
const semver = require('semver');
const inquirer = require('inquirer');
const { spawn } = require('child_process');
const { symbols, hr, getSpinner, getProgress } = require('core/ui');
const { printError, printInfo } = require('core/util');
const { debug, getPlatform, RELEASE_ASSETS, DEFAULT_MIRROR } = require('core/env');
const { printLogo } = require('core/util');
const { copyReleaseConfig } = require('core/forge-config');
const { updateReleaseYaml } = require('core/forge-fs');
const {
  requiredDirs,
  isForgeBinExists,
  getGlobalForgeVersion,
  getAllChainNames,
} = require('core/forge-fs');
const { isForgeStarted } = require('core/forge-process');

function fetchReleaseVersion(mirror = DEFAULT_MIRROR) {
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

function fetchAssetInfo(platform, version, key, mirror = DEFAULT_MIRROR) {
  const name = `${key}_${platform}_amd64.tgz`;
  const url = `${mirror}/forge/${version}/${name}`;
  const defaultSize = {
    forge: 28 * 1024 * 1024,
    forge_web: 28 * 1024 * 1024,
    forge_workshop: 13 * 1024 * 1024,
    simulator: 9 * 1024 * 1024,
  };

  const spinner = getSpinner(`Fetching release asset info: ${name}...`);
  spinner.start();

  try {
    const { code, stdout, stderr } = shell.exec(`curl -I --silent "${url}"`, { silent: true });
    debug('fetchAssetInfo', { url, platform, version, code, stdout, stderr });
    if (code === 0 && stdout) {
      const notFound = stdout
        .split('\r\n')
        .find(x => x.indexOf('HTTP/1.1 404') === 0 || x.indexOf('HTTP/2 404') === 0);
      if (notFound) {
        spinner.fail(`Release asset "${url}" not found`);
        process.exit(1);
      }
      spinner.succeed(`Release asset info fetch success ${name}`);
      const header = stdout.split('\r\n').find(x => x.indexOf('Content-Length:') === 0);
      const size = header ? Number(header.split(':').pop().trim()) : defaultSize[key]; // prettier-ignore
      return { key, name, url, size, header };
    }
    spinner.fail(`Release asset info error: ${stderr}`);
  } catch (err) {
    spinner.fail(`Release asset info error: ${err.message}`);
  }

  process.exit(1);
}

function downloadAsset(asset) {
  return new Promise((resolve, reject) => {
    debug('Download asset', asset);
    const assetOutput = path.join(requiredDirs.tmp, asset.name);
    try {
      shell.rm(assetOutput);
    } catch (err) {
      // Do nothing
    }
    shell.echo(`${symbols.info} Start download ${asset.url}`);
    const progress = getProgress({
      title: `${symbols.info} Downloading ${asset.name}`,
      unit: 'MB',
    });
    const total = (asset.size / 1024 / 1024).toFixed(2);
    progress.start(total, 0);

    // update progress bar
    const timer = setInterval(() => {
      if (fs.existsSync(assetOutput)) {
        const stat = fs.statSync(assetOutput);
        progress.update((stat.size / 1024 / 1024).toFixed(2));
      }
    }, 500);

    shell.exec(
      `curl ${asset.url} --silent --out ${assetOutput}`,
      { async: true, silent: true },
      (code, _, stderr) => {
        clearInterval(timer);
        progress.update(total);
        progress.stop();

        if (code === 0) {
          shell.echo(`${symbols.success} Downloaded ${asset.name} to ${assetOutput}`);
          return resolve(assetOutput);
        }

        shell.echo(`${symbols.error} ${stderr}`);
        reject(new Error(`${asset.name} download failed`));
      }
    );
  });
}

function expandReleaseTarball(filePath, subFolder, version) {
  const fileName = path.basename(filePath);
  const targetDir = path.join(requiredDirs.release, subFolder, version);
  shell.exec(`mkdir -p ${targetDir}`);
  shell.exec(`cp ${filePath} ${targetDir}`);
  shell.exec(`cd ${targetDir} && tar -zxf ${fileName} && rm -f ${fileName}`);
  shell.echo(`${symbols.success} Expand release asset ${filePath} to ${targetDir}`);
}

async function main({ args: [userVersion], opts: { mirror, silent } }) {
  try {
    const platform = await getPlatform();
    shell.echo(`${symbols.info} Detected platform is: ${platform}`);
    if (mirror && mirror !== DEFAULT_MIRROR) {
      shell.echo(`${symbols.info} ${chalk.yellow(`Using custom mirror: ${mirror}`)}`);
    }

    const userVer = semver.coerce(userVersion) ? semver.coerce(userVersion).version : '';
    const version = userVer || fetchReleaseVersion(mirror);

    const currentVersion = getGlobalForgeVersion();
    if (isForgeBinExists(version)) {
      printInfo(`already initialized version: ${version}`);

      if (semver.eq(version, currentVersion)) {
        shell.echo(hr);
        shell.echo(chalk.cyan('Current forge release'));
        shell.echo(hr);
        shell.exec('forge version');
      }

      return process.exit(1);
    }

    // Ensure forge is stopped, because init on an running node may cause some mess
    const isStarted = await isForgeStarted();
    if (isStarted) {
      printError('Forge is running, reinitialize will break things!');
      printInfo(`To reinitialize, please run ${chalk.cyan('forge stop')} first!`);
      return process.exit(1);
    }

    printLogo();

    // Start download and unzip
    for (const asset of RELEASE_ASSETS) {
      const assetInfo = fetchAssetInfo(platform, version, asset, mirror);
      debug(asset, assetInfo);
      // eslint-disable-next-line no-await-in-loop
      const assetTarball = await downloadAsset(assetInfo);
      expandReleaseTarball(assetTarball, asset, version);
      if (asset === 'forge') {
        // FIXME: copy the latest config as shared config on each release?
        await copyReleaseConfig(version); // eslint-disable-line
      }
      if (asset === 'forge' || asset === 'simulator') {
        updateReleaseYaml(asset, version);
      }
    }

    shell.echo(`${symbols.success} Congratulations! forge v${version} installed successfully!`);
    shell.echo('');

    if (!silent) {
      const chainsCount = getAllChainNames().length;
      if (chainsCount > 0) {
        printInfo(`If you want to custom the config, run: ${chalk.cyan('forge config set')}`);
        return;
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
    shell.echo(`${symbols.error} Forge initialize failed, please try again later`);
  }
}

exports.run = main;
exports.execute = main;
exports.fetchReleaseVersion = fetchReleaseVersion;
exports.fetchAssetInfo = fetchAssetInfo;
exports.downloadAsset = downloadAsset;
exports.expandReleaseTarball = expandReleaseTarball;
