const chalk = require('chalk');

const { getSpinner, symbols } = require('core/ui');
const { webUrl, runNativeWebCommand } = require('core/env');
const debug = require('core/debug')('start');
const { addChainHostToNetworkList } = require('core/forge-fs');
const { printError, printInfo, printWarning, printSuccess } = require('core/util');
const { getForgeWebProcess } = require('core/forge-process');
const GraphQLClient = require('@arcblock/graphql-client');

function processOutput(output, action) {
  if (/:error/.test(output)) {
    if (/:already_started/.test(output)) {
      printWarning('Forge Web already started');
    } else {
      printError(`Forge Web ${action} failed: ${output.trim()}`);
    }
  } else {
    printSuccess(`Forge Web ${action} success!`);
  }
}

async function checkGraphQLServerStarted(client, maxRetry = 6) {
  return new Promise(resolve => {
    let counter = 0;

    // eslint-disable-next-line
    const intervalId = setInterval(async () => {
      if (counter++ >= maxRetry) {
        clearInterval(intervalId);
        return resolve(false);
      }

      try {
        const { code } = await client.getChainInfo();
        if (code === 'OK') {
          clearInterval(intervalId);
          return resolve(true);
        }

        debug('check.graphql response:', code);
      } catch (error) {
        debug('check.graphql error', error.message);
      }
    }, 1000);
  });
}

async function startForgeWeb(name, timeout = 10000) {
  const startWebUI = runNativeWebCommand('daemon', { silent: true });
  const { stderr } = startWebUI();

  if (stderr) {
    debug(`${symbols.error} forge web start failed: ${stderr}!`);
    processOutput(stderr);
    return false;
  }

  const endpoint = `${webUrl()}/api`;
  const client = new GraphQLClient(endpoint);
  if (!(await checkGraphQLServerStarted(client, Math.ceil(timeout / 1000)))) {
    debug(`${symbols.error} graphql service failed to start!`);
    return false;
  }

  addChainHostToNetworkList({ name, endpoint });
  return true;
}

const start = async chainName => {
  const { pid } = await getForgeWebProcess(chainName);
  if (pid) {
    printInfo('Forge Web already started');
    process.exit(0);
    return;
  }

  const spinner = getSpinner('Waiting for Forge Web to start...');
  spinner.start();
  const succeed = await startForgeWeb(chainName, 20000);
  if (!succeed) {
    spinner.fail(`Forge web start failed, please retry with ${chalk.cyan('Forge Web start')}`);
    return;
  }

  spinner.succeed('Forge Web successfully started');
  printInfo(`Forge Web running at:     ${webUrl()}`);
  printInfo(`GraphQL endpoint at:      ${webUrl()}/api`);
};

module.exports = {
  start,
};
