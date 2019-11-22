/* eslint no-case-declarations:"off" */
const chalk = require('chalk');
const shell = require('shelljs');
const GraphQLClient = require('@arcblock/graphql-client');

const debug = require('core/debug')('web');
const { symbols, getSpinner } = require('core/ui');
const { print, printError, printInfo, printSuccess, printWarning } = require('core/util');
const { sleep } = require('core/util');
const { runNativeWebCommand, webUrl } = require('core/env');
const { getForgeWebProcess } = require('core/forge-process');

const startWebUI = runNativeWebCommand('daemon', { silent: true });

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

async function startForgeWeb(timeout = 10000) {
  const { stderr } = startWebUI();

  if (stderr) {
    debug(`${symbols.error} forge web start failed: ${stderr}!`);
    processOutput(stderr);
    return false;
  }

  const client = new GraphQLClient(`${webUrl()}/api`);
  if (!(await checkGraphQLServerStarted(client, Math.ceil(timeout / 1000)))) {
    debug(`${symbols.error} graphql service failed to start!`);
    return false;
  }

  return true;
}

async function main({ args: [action = 'none'], opts }) {
  const { pid } = await getForgeWebProcess();

  debug(`forge web pid: ${pid}`);

  /* eslint-disable indent */
  switch (action) {
    case 'none':
      shell.exec('forge web -h --color always');
      break;
    case 'start':
      if (pid) {
        printInfo('Forge Web already started');
        process.exit(0);
        return;
      }

      const spinner = getSpinner('Waiting for Forge Web to start...');
      spinner.start();
      const succeed = await startForgeWeb(20000);
      if (!succeed) {
        spinner.fail(`Forge web start failed, please retry with ${chalk.cyan('Forge Web start')}`);
        break;
      }

      spinner.succeed('Forge Web successfully started');
      printInfo(`Forge Web running at:     ${webUrl()}`);
      printInfo(`GraphQL endpoint at:      ${webUrl()}/api`);
      break;
    case 'stop':
      if (!pid) {
        printInfo('Forge Web not started yet');
        process.exit(0);
        return;
      }

      printInfo('Stopping Forge Web...');
      shell.exec(`kill ${pid}`);
      printSuccess('Forge Web stopped');
      break;
    case 'open':
      if (!pid) {
        printInfo('Forge Web not started yet');
        await main({ args: ['start'] });
        await sleep(2000);
      }

      const url = opts.graphql ? `${webUrl()}/api/playground` : webUrl();
      print(`Opening ${url}...`);
      shell.exec(`open ${url}`);
      break;
    default:
      break;
  }
  /* eslint-enable indent */
}

exports.run = main;
exports.execute = main;
exports.start = () => main({ args: ['start'] });
