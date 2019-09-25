/* eslint-disable consistent-return */
const chalk = require('chalk');
const fs = require('fs');
const shell = require('shelljs');

const { symbols, hr, getSpinner } = require('core/ui');
const { config } = require('core/env');
const debug = require('core/debug')('start');
const { checkStartError } = require('core/forge-fs');
const { sleep, print, printError, printInfo } = require('core/util');
const { isForgeStarted, getProcessTag, getAllRunningProcesses } = require('core/forge-process');

const { printAllProcesses } = require('../ps/ps');
const { stop } = require('../stop/stop');
const { start: startWeb } = require('../../tools/web/web');

function getForgeReleaseEnv() {
  if (process.env.FORGE_RELEASE && fs.existsSync(process.env.FORGE_RELEASE)) {
    return process.env.FORGE_RELEASE;
  }

  return config.get('cli.forgeReleaseDir');
}

async function main({
  opts: { dryRun, allowMultiChain = false },
  args: [chainName = process.env.FORGE_CURRENT_CHAIN],
}) {
  const tmp = await start(chainName, dryRun, allowMultiChain);
  process.exit(tmp === true ? 0 : 1);
}

async function start(chainName, dryRun = false, allowMultiChain) {
  if (allowMultiChain === false) {
    const runningChains = await getAllRunningProcesses();
    if (runningChains.length > 0) {
      printInfo(`Chain ${chalk.cyan(chalk.cyan(chainName))} is already started!`);
      await printAllProcesses();
      return true;
    }
  }

  if (await isForgeStarted(chainName)) {
    printInfo(`Chain ${chalk.cyan(chalk.cyan(chainName))} is already started!`);
    return true;
  }

  const { starterBinPath, forgeBinPath, forgeConfigPath } = config.get('cli');

  // add `-sname` parameter to enable start multiple forge processes
  let startCommandPrefix = '';
  if (allowMultiChain) {
    startCommandPrefix = `ERL_AFLAGS="-sname ${getProcessTag(
      'forge',
      chainName,
      allowMultiChain
    )}" FORGE_CONFIG=${forgeConfigPath} ${forgeBinPath}`;
  } else {
    startCommandPrefix = `ERL_AFLAGS="-sname ${getProcessTag(
      'starter',
      chainName,
      allowMultiChain
    )}" FORGE_CONFIG=${forgeConfigPath} FORGE_RELEASE=${getForgeReleaseEnv()} ${starterBinPath}`;
  }
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

    return true;
  }

  const command = `${startCommandPrefix} ${startType}`;
  debug('start command', command);

  const spinner = getSpinner(`Waiting for chain ${chalk.yellow(chainName)} to start...`);
  spinner.start();
  try {
    const startAt = Date.now();
    shell.exec(command);
    await waitUntilStarted(chainName, 40000);
    await sleep(6000);
    const errMessage = await checkStartError(chainName, startAt);
    if (errMessage) {
      throw new Error(`${errMessage.status}: ${errMessage.message}`);
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
        `forge status -c ${chainName}`
      )}`
    );
    return true;
  } catch (err) {
    debug.error(err);
    shell.echo();
    printError(`Forge start failed: ${err.message}`);

    spinner.fail('Forge cannot be successfully started, now exiting...');

    await stop(chainName, false);

    print();
    printInfo('Possible solutions:');
    print(hr);
    print('1. Cleanup already running forge');
    print('Ensure no running forge process that cannot be detected by forge-cli');
    print(
      `Run: ${chalk.cyan(
        `forge stop ${chainName}`
      )}, to stop forge related processes, then try ${chalk.cyan(`forge start ${chainName}`)} again`
    );
    print();
    print('2. Report bug to our engineer');
    print('It is very likely that forge cannot be started on your environment');
    print(`Please run: ${chalk.cyan(`forge start ${chainName} --dry-run`)}`);

    return false;
  }
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
