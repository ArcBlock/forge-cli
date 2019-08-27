const chalk = require('chalk');
const shell = require('shelljs');
const semver = require('semver');
const { symbols } = require('core/ui');
const { config } = require('core/env');
const { isForgeStarted } = require('core/forge-process');
const debug = require('core/debug')('release:use');
const { updateReleaseYaml, updateChainConfig } = require('core/forge-fs');
const { print, printError, printSuccess } = require('core/util');
const { listReleases } = require('cli/release/list/list');

// eslint-disable-next-line consistent-return
async function main({
  args: [userVersion],
  opts: { chainName = process.env.FORGE_CURRENT_CHAIN, allowMultiChain = false },
}) {
  try {
    const version =
      userVersion && semver.coerce(userVersion) ? semver.coerce(userVersion).version : '';
    if (version === config.get('cli.currentVersion')) {
      shell.echo(`${symbols.warning} Already using forge release v${version}`);
      return process.exit(1);
    }

    if (allowMultiChain === false) {
      if (await isForgeStarted()) {
        shell.echo(`${symbols.warning} Please stop forge before activate another version`);
        return process.exit(1);
      }
    }

    const { forge } = listReleases();
    if (!forge.includes(version)) {
      shell.echo(
        `${
          symbols.error
        } forge release v${version} not downloaded, please download it with ${chalk.cyan(
          `forge download ${version}`
        )}`
      );
      return process.exit(1);
    }

    updateReleaseYaml('forge', version);
    updateChainConfig(chainName, { version });
    debug(`'${chainName}' chain version updated:`, version);

    printSuccess(`forge v${version} activated successfully!`);
    print('');
    print(`Now you can start forge with ${chalk.cyan(`forge start ${chainName}`)}`);
    print('');
  } catch (err) {
    debug.error(err);
    printError('Forge release activate failed');
  }
}

exports.run = main;
exports.execute = main;
