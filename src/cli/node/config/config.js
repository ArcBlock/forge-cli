const fs = require('fs');
const chalk = require('chalk');
const shell = require('shelljs');
const { symbols, hr } = require('core/ui');
const { config, webUrl } = require('core/env');
const { isForgeStarted } = require('core/forge-process');
const GraphQLClient = require('@arcblock/graphql-client');

const { askUserConfigs } = require('./lib');

async function main({ args: [action = 'get'], opts: { peer } }) {
  if (action === 'get') {
    if (peer) {
      const client = new GraphQLClient(`${webUrl()}/api`);
      // eslint-disable-next-line no-shadow
      const { config } = await client.getConfig({ parsed: true });
      shell.echo(`${symbols.success} config for peer:`);
      shell.echo(hr);
      shell.echo(config);
    } else {
      const { forgeConfigPath } = config.get('cli');
      shell.echo(hr);
      shell.echo(`${symbols.info} config file path: ${forgeConfigPath}`);
      shell.echo(hr);
      shell.echo(fs.readFileSync(forgeConfigPath).toString());
    }

    return;
  }

  if (action === 'set') {
    const isStarted = await isForgeStarted();
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

    askUserConfigs(config.get('cli'));
  }
}

exports.run = main;
exports.execute = main;
