/* eslint-disable consistent-return */
const chalk = require('chalk');
const fs = require('fs');
const shell = require('shelljs');

const { symbols, hr, getSpinner } = require('core/ui');
const { config } = require('core/env');
const debug = require('core/debug')('start');
const { getLogfile } = require('core/forge-fs');
const { sleep, print, printError, printInfo } = require('core/util');
const { isForgeStarted, getProcessTag, getAllRunningProcesses } = require('core/forge-process');

const { printAllProcesses } = require('../ps/ps');
const { stop } = require('../stop/stop');
const { start: startWeb } = require('../web/web');

async function main({
  opts: { dryRun, allowMultiChain = false },
  args: [chainName = process.env.FORGE_CURRENT_CHAIN],
}) {
  const tmp = await start(chainName, dryRun, allowMultiChain);
  process.exit(tmp ? 0 : 1);
}

async function start(chainName, dryRun = false, allowMultiChain) {
  if (allowMultiChain === false) {
    const runningChains = await getAllRunningProcesses();
    if (runningChains.length > 0) {
      printError('Forge CLI is configured to work with single chain only, abort!');
      await printAllProcesses();
      process.exit(0);
    }
  }

  if (await isForgeStarted(chainName)) {
    printInfo(`Chain ${chalk.cyan(chalk.cyan(chainName))} is already started!`);
    return;
  }

  const { forgeBinPath, forgeConfigPath } = config.get('cli');

  // add `-sname` parameter to enable start multiple forge processes
  const startCommandPrefix = `ERL_AFLAGS="-sname ${getProcessTag(
    'forge'
  )}" FORGE_CONFIG=${forgeConfigPath} ${forgeBinPath}`;
  const startType = 'daemon';

  if (dryRun) {
    printInfo('Command to debug forge starting issue:');
    print(hr);
    print(chalk.cyan(`${startCommandPrefix} start`));
    print(hr);
    const url = 'https://github.com/ArcBlock/forge-cli/issues';
    printInfo(
      `Please create an issue on ${chalk.cyan(url)} with output after running above command`
    );
    return;
  }

  const command = `${startCommandPrefix} ${startType}`;
  debug('start command', command);

  const spinner = getSpinner(`Waiting for chain ${chalk.yellow(chainName)} to start...`);
  spinner.start();
  try {
    shell.exec(command);
    await waitUntilStarted(chainName, 40000);
    await sleep(6000);
    const startAt = Date.now();
    const errMessage = await checkError(chainName, startAt);
    if (errMessage) {
      throw new Error(errMessage);
    }

    spinner.succeed(`Chain ${chalk.yellow(chainName)} successfully started`);
    if (config.get('forge.web.enabled')) {
      await startWeb();
    }

    await printAllProcesses();

    shell.echo(
      `${symbols.info} For interactive console, please run ${chalk.cyan(
        `forge remote -c ${chainName}`
      )}`
    );
    shell.echo(
      `${symbols.info} For forge web interface, please run ${chalk.cyan(
        `forge web open -c ${chainName}`
      )}`
    );
    shell.echo(`${symbols.info} For above process list, please run ${chalk.cyan('forge ps')}`);
    shell.echo(
      `${symbols.info} If you want to know forge status detail, please run ${chalk.cyan(
        `${symbols.info} For forge status detail, please run ${chalk.cyan(
          `forge status -c ${chainName}`
        )}`
      )}`
    );
    return true;
  } catch (err) {
    debug.error(err);
    shell.echo();
    shell.echo(`${symbols.error} Forge start failed: ${err.message}`);

    spinner.fail('Forge cannot be successfully started, now exiting...');

    await stop(chainName, false);

    shell.echo();
    shell.echo(`${symbols.info} Possible solutions:`);
    shell.echo(hr);
    shell.echo('1. Cleanup already running forge');
    shell.echo('Ensure no running forge process that cannot be detected by forge-cli');
    shell.echo(
      `Run: ${chalk.cyan(
        `forge stop ${chainName}`
      )}, to stop forge related processes, then try ${chalk.cyan(`forge start ${chainName}`)} again`
    );
    shell.echo('');
    shell.echo('2. Report bug to our engineer');
    shell.echo('It is very likely that forge cannot be started on your environment');
    shell.echo(`Please run: ${chalk.cyan(`forge start ${chainName} --dry-run`)}`);

    return false;
  }
}

function checkError(chainName, startAtMs) {
  return new Promise(resolve => {
    const errorFilePath = getLogfile(chainName, 'exit_status.json');
    fs.stat(errorFilePath, (err, stats) => {
      if (!err && stats.ctimeMs > startAtMs) {
        const { status, message } = JSON.parse(fs.readFileSync(errorFilePath).toString());
        return resolve(`${status}: ${message}`);
      }

      resolve(null);
    });
  });
}

function waitUntilStarted(chainName, timeout = 30000) {
  return new Promise(async (resolve, reject) => {
    if (await isForgeStarted(chainName)) {
      return resolve();
    }

    let timeElapsed = 0;
    const interval = 800;
    const timer = setInterval(async () => {
      if (await isForgeStarted(chainName)) {
        clearInterval(timer);
        return resolve();
      }

      if (timeElapsed > timeout) {
        clearInterval(timer);
        reject(new Error(`forge is not started within ${timeout / 1000} seconds`));
      }

      timeElapsed += interval;
    }, interval);
  });
}

exports.execute = main;
exports.run = main;
exports.start = start;
