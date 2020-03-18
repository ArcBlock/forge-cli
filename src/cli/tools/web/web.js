/* eslint no-case-declarations:"off" */
const chalk = require('chalk');
const shell = require('shelljs');
const GraphQLClient = require('@arcblock/graphql-client');
const pm2 = require('pm2');

const debug = require('core/debug')('web');
const { symbols, getSpinner } = require('core/ui');
const { printError, printInfo, printSuccess, printWarning } = require('core/util');
const { runNativeWebCommand, webUrl } = require('core/env');
const { getForgeWebProcess } = require('core/forge-process');
const { addChainHostToNetworkList } = require('core/forge-fs');

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

async function startForgeWeb(name, timeout = 10000) {
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

async function main({
  args: [action = 'none'],
  opts: { chainName = process.env.FORGE_CURRENT_CHAIN } = {},
}) {
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
      const succeed = await startForgeWeb(chainName, 20000);
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
      const pm2Id = 'arc-forge-web';
      const port = 3000;

      const openBrowser = () => {
        const url = `http://localhost:${port}?network=${chainName}`;
        printInfo(`Opening ${url}`);
        shell.exec(`open ${url}`);
      };

      pm2.describe(pm2Id, (describeError, [info]) => {
        if (describeError) {
          throw describeError;
        }

        if (info && info.pm2_env && info.pm2_env.status === 'online') {
          pm2.disconnect();
          openBrowser(port);
          return;
        }

        pm2.start(
          {
            name: pm2Id,
            script: './server.js',
            max_memory_restart: '100M',
            cwd: __dirname,
            env: {
              FORGE_WEB_PROT: port,
            },
          },
          err => {
            pm2.disconnect();

            if (err) {
              printError('Forge Web exited error', err);
              return;
            }

            printInfo(`Forge Web is listening on port ${port}`);
            openBrowser(port);
          }
        );
      });

      break;
    default:
      break;
  }
  /* eslint-enable indent */
}

exports.run = main;
exports.execute = main;
exports.start = () => main({ args: ['start'] });
