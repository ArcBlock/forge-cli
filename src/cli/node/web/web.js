/* eslint no-case-declarations:"off" */
const chalk = require('chalk');
const shell = require('shelljs');
const GraphQLClient = require('@arcblock/graphql-client');
const { runNativeWebCommand, webUrl, sleep, debug } = require('core/env');
const { symbols } = require('core/ui');
const { findServicePid } = require('core/forge-process');

const startWebUI = runNativeWebCommand('daemon', { silent: true });

function processOutput(output, action) {
  if (/:error/.test(output)) {
    if (/:already_started/.test(output)) {
      shell.echo(`${symbols.warning} forge web already started`);
    } else {
      shell.echo(`${symbols.error} forge web ${action} failed: ${output.trim()}`);
    }
  } else {
    shell.echo(`${symbols.success} forge web ${action} success!`);
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

        debug('check.graphql response', code);
      } catch (error) {
        debug.error('check.graphql error', error.message);
      }
    }, 1000);
  });
}

async function startForgeWeb(timeout = 10000) {
  const { stderr } = startWebUI();

  if (stderr) {
    debug(`${symbols.error} start Web UI failed: ${stderr}!`);
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
  const pid = await findServicePid('forge_web');

  /* eslint-disable indent */
  switch (action) {
    case 'none':
      shell.exec('forge web -h --color always');
      break;
    case 'start':
      if (pid) {
        shell.echo(`${symbols.info} forge web already started.`);
        process.exit(0);
        return;
      }

      shell.echo(`${symbols.info} Starting forge web...`);
      const succeed = await startForgeWeb(20000);
      if (!succeed) {
        shell.echo(
          `${symbols.warning} forge web failed to start, please retry with ${chalk.cyan(
            'forge web start'
          )}`
        );
        break;
      }

      shell.echo(`${symbols.info} forge web running at:     ${webUrl()}`);
      shell.echo(`${symbols.info} graphql endpoint at:      ${webUrl()}/api`);
      break;
    case 'stop':
      if (!pid) {
        shell.echo(`${symbols.info} forge web not started yet`);
        process.exit(1);
        return;
      }

      shell.echo(`${symbols.info} Stopping forge web...`);
      shell.exec(`kill ${pid}`);
      break;
    case 'open':
      if (!pid) {
        shell.echo(`${symbols.info} forge web not started yet`);
        await main({ args: ['start'] });
        await sleep(2000);
      }

      const url = opts.graphql ? `${webUrl()}/api/playground` : webUrl();
      shell.echo(`Opening ${url}...`);
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
