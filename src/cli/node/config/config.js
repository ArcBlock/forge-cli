const fs = require('fs');
const chalk = require('chalk');
const shell = require('shelljs');
const { symbols, hr } = require('core/ui');
const { webUrl } = require('core/env');
const { isForgeStarted } = require('core/forge-process');
const GraphQLClient = require('@arcblock/graphql-client');
const toml = require('@iarna/toml');

const { getProfileReleaseFilePath } = require('core/forge-fs');
const { printInfo } = require('core/util');

const { askUserConfigs, writeConfigs } = require('./lib');

async function main({
  args: [action = 'get'],
  opts: { peer, chainName = process.env.FORGE_CURRENT_CHAIN },
}) {
  if (action === 'get') {
    if (peer) {
      const client = new GraphQLClient(`${webUrl()}/api`);
      // eslint-disable-next-line no-shadow
      const { config } = await client.getConfig({ parsed: true });
      shell.echo(`${symbols.success} config for peer:`);
      shell.echo(hr);
      shell.echo(config);
    } else {
      const forgeConfigPath = getProfileReleaseFilePath(chainName);
      shell.echo(hr);
      shell.echo(`${symbols.info} config file path: ${forgeConfigPath}`);
      shell.echo(hr);
      shell.echo(fs.readFileSync(forgeConfigPath).toString());
    }

    return;
  }

  if (action === 'set') {
    const isStarted = await isForgeStarted(chainName);
    if (isStarted) {
      shell.echo(
        `${symbols.warning} ${chalk.yellow(
          'You are trying to modify the configuration of a running forge chain/node.'
        )}`
      );
      shell.echo(
        `${symbols.warning} ${chalk.yellow(
          'token and chainId configuration cannot be changed once the chain is started'
        )}`
      );
      shell.echo(
        `${symbols.warning} ${chalk.yellow(
          'If you really need to do so, please stop and reset the chain first'
        )}`
      );

      process.exit(1);
    }

    const originConfigFilePath = getProfileReleaseFilePath(chainName);
    const defaults = toml.parse(fs.readFileSync(originConfigFilePath).toString());
    const configs = await askUserConfigs(defaults, chainName, false);

    await writeConfigs(getProfileReleaseFilePath(chainName), configs, true);
    printInfo('you need to restart the chain to load the new config!');
  }
}

exports.run = main;
exports.execute = main;
