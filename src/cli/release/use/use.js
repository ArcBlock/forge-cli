const chalk = require('chalk');
const shell = require('shelljs');
const semver = require('semver');
const { symbols } = require('core/ui');
const { config } = require('core/env');
const { isForgeStarted } = require('core/forge-process');
const debug = require('core/debug')('release:use');
const { updateReleaseYaml } = require('core/forge-fs');
const { listReleases } = require('cli/release/list/list');

// eslint-disable-next-line consistent-return
async function main({
  args: [userVersion],
  opts: { chainName = process.env.FORGE_CURRENT_CHAIN },
}) {
  try {
    const version =
      userVersion && semver.coerce(userVersion) ? semver.coerce(userVersion).version : '';
    if (version === config.get('cli.currentVersion')) {
      shell.echo(`${symbols.warning} Already using forge release v${version}`);
      return process.exit(1);
    }

    if (await isForgeStarted()) {
      shell.echo(`${symbols.warning} Please stop forge before activate another version`);
      return process.exit(1);
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

    shell.echo(`${symbols.success} forge v${version} activated successfully!`);
    shell.echo('');
    shell.echo(`Now you can start forge with ${chalk.cyan(`forge start ${chainName}`)}`);
    shell.echo('');
  } catch (err) {
    debug.error(err);
    shell.echo(`${symbols.error} Forge release activate failed`);
  }
}

exports.run = main;
exports.execute = main;
