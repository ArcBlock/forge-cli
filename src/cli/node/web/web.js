/* eslint no-case-declarations:"off" */
const shell = require('shelljs');
const { runNativeWebCommand, findServicePid, webUrl, sleep } = require('core/env');
const { symbols } = require('core/ui');

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

async function main({ args: [action = 'none'], opts }) {
  const pid = await findServicePid('forge_web');

  /* eslint-disable indent */
  switch (action) {
    case 'none':
      shell.exec('forge web -h --color always');
      break;
    case 'start':
      if (pid) {
        shell.echo(`${symbols.info} forge web already started`);
        process.exit(0);
        return;
      }

      const { stdout, stderr } = startWebUI();
      processOutput(stdout || stderr, action);
      shell.echo(`${symbols.info} forge web running at:     ${webUrl()}`);
      shell.echo(`${symbols.info} graphql endpoint at:      ${webUrl()}/api`);
      break;
    case 'stop':
      if (!pid) {
        shell.echo(`${symbols.info} forge web not started yet`);
        process.exit(1);
        return;
      }

      shell.echo('Stopping forge web...');
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
