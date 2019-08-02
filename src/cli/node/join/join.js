const fs = require('fs');
const path = require('path');
const toml = require('@iarna/toml');
const semver = require('semver');
const shell = require('shelljs');
const chalk = require('chalk');
const inquirer = require('inquirer');
const get = require('lodash/get');
const set = require('lodash/set');
const GraphQLClient = require('@arcblock/graphql-client');
const { config, ensureConfigComment } = require('core/env');
const { getProfileKeyFilePath } = require('core/forge-fs');
const { isForgeStarted } = require('core/forge-process');
const { symbols } = require('core/ui');
const debug = require('core/debug');

async function main({ args: [endpoint = ''], opts: { yes, chainName } }) {
  if (!endpoint) {
    shell.echo(`${symbols.error} forge web graphql endpoint must be provided!`);
    shell.echo(
      `${symbols.info} if you want to join our nightly test net, use https://test.abtnetwork.io/api`
    );
  }

  const isStarted = await isForgeStarted(chainName);
  if (isStarted) {
    shell.echo(`${symbols.error} forge is running!`);
    shell.echo(
      `${symbols.info} Please run ${chalk.cyan('forge stop')} first, then join another network!`
    );

    process.exit(0);
    return;
  }

  const client = new GraphQLClient(endpoint);
  try {
    const [{ info }, res] = await Promise.all([client.getChainInfo(), client.getConfig()]);

    if (info && res.config) {
      // Detect version match
      const { forgeConfigPath, currentVersion } = config.get('cli');

      const localVersion = {
        major: semver.major(currentVersion),
        minor: semver.minor(currentVersion),
      };
      const remoteVersion = {
        major: semver.major(info.version),
        minor: semver.minor(info.version),
      };

      if (
        localVersion.major !== remoteVersion.major ||
        localVersion.minor !== remoteVersion.minor
      ) {
        shell.echo(
          `${symbols.error} forge join requires version match: { local: ${currentVersion}, remote: ${info.version} }!`
        );
        shell.echo(
          `${symbols.info} You can only join the remote chain if you are using the same forge version!`
        );
        shell.echo(
          `${symbols.info} Run ${chalk.cyan(
            `forge download v${info.version}`
          )} to get the match version!`
        );
        process.exit(0);
        return;
      }

      // Confirm operation
      const localConfig = toml.parse(fs.readFileSync(forgeConfigPath).toString());
      if (!yes) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            default: false,
            message: chalk.red(
              'Join a new network means completely sync data from another peer.\n All local data will be erased, are you sure to continue?'
            ),
          },
        ]);

        if (confirm) {
          const oldDir = path.dirname(localConfig.forge.path);
          const bakDir = `${oldDir}_backup_${Date.now()}`;

          shell.echo(`${symbols.info} all state backup to ${bakDir}`);
          shell.exec(`mv ${oldDir} ${bakDir}`);

          const keyDataPath = getProfileKeyFilePath(chainName);
          debug(` rm -rf ${getProfileKeyFilePath(chainName)}`);
          shell.exec(`rm -rf ${keyDataPath}`);
        } else {
          shell.echo(`${symbols.info} User abort, nothing changed!`);
          process.exit(0);
          return;
        }
      }

      const remoteConfig = toml.parse(res.config);
      fs.writeFileSync(`${forgeConfigPath}.backup`, toml.stringify(remoteConfig));

      // Backup old file
      const backupFile = `${forgeConfigPath}.${Date.now()}`;
      shell.exec(`cp ${forgeConfigPath} ${backupFile}`);
      shell.echo(`${symbols.success} Forge config was backup to ${chalk.cyan(backupFile)}`);

      // Merge remote config into local config
      const keysToMerge = [
        'forge.pub_sub_key',
        'forge.token',
        'forge.stake',
        'forge.moderator',
        'forge.accounts',
        'forge.poke',
        'forge.rpc',
        'forge.release',
        'forge.transaction',
        'tendermint.persistent_peers',
        'tendermint.seed_peers',
        'tendermint.timeout_propose',
        'tendermint.timeout_approve',
        'tendermint.timeout_precommit',
        'tendermint.timeout_commit',
        'tendermint.genesis',
      ];

      keysToMerge.forEach(x => {
        const remoteValue = get(remoteConfig, x);
        if (typeof remoteValue !== 'undefined') {
          shell.echo(`${symbols.info} merge config ${x}:`, remoteValue);
          set(localConfig, x, remoteValue);
        }
      });

      // Write new config
      fs.writeFileSync(forgeConfigPath, ensureConfigComment(toml.stringify(localConfig)));

      shell.echo(
        `${symbols.success} Forge config was updated! Inspect by running ${chalk.cyan(
          `cat ${forgeConfigPath}`
        )}`
      );
      shell.echo(`${symbols.info} You must start/restart forge to use the latest config`);
    }
  } catch (err) {
    shell.echo(`${symbols.error} Cannot fetch forge config from endpoint ${endpoint}`);
    process.exit(1);
  }
}

exports.run = main;
exports.execute = main;
