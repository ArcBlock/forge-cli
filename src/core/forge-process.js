/* eslint-disable no-console */
const assert = require('assert');
const pidUsage = require('pidusage');
const prettyBytes = require('pretty-bytes');
const findProcess = require('find-process');
const shell = require('shelljs');

const debug = require('./debug')('forge-process');
const { getAllAppNames } = require('./forge-config');
const { getTendermintHomeDir } = require('./forge-fs');
const { prettyTime, md5, sleep } = require('./util');
const { DEFAULT_CHAIN_NAME } = require('../constant');

const processSortHandler = (x, y) => {
  // make default chain the first in order
  if (x.name === DEFAULT_CHAIN_NAME) {
    return -1;
  }

  if (y.name === DEFAULT_CHAIN_NAME) {
    return 1;
  }

  if (x.name > y.name) {
    return 1;
  }
  if (x.name < y.name) {
    return -1;
  }

  return 0;
};

const getProcessTag = (name, appName = process.env.PROFILE_NAME) => {
  if (!name) {
    return `forge-${md5(appName)}`;
  }

  return `forge-${name}-${md5(appName)}`;
};

async function findServicePid(n) {
  const list = await findProcess('name', n);
  const match = list.find(x => x.name === 'beam.smp');
  return match ? match.pid : 0;
}

async function getTendermintProcess(appName) {
  const homeDir = getTendermintHomeDir(appName);
  const tendermintProcess = await findProcess('name', 'tendermint');

  const tmp = tendermintProcess.find(({ cmd }) => cmd.includes(homeDir));
  return { name: 'tendermint', pid: tmp ? tmp.pid : 0 };
}

async function findForgeEpmdDeamon() {
  const tendermintProcess = await findProcess('name', 'epmd');

  const tmp = tendermintProcess.find(({ cmd }) => cmd.includes('forge'));
  return { name: 'forge-epmd', pid: tmp ? tmp.pid : 0 };
}

async function isForgeStarted(appName = process.env.PROFILE_NAME) {
  const { pid } = await getTendermintProcess(appName);

  return !!pid;
}

async function getForgeProcess(chainName = process.env.PROFILE_NAME) {
  const forgeProcesses = await findProcess('name', 'forge');

  const forgeProcess = forgeProcesses.find(
    ({ cmd }) => cmd.includes('/bin/beam.smp') && cmd.includes(getProcessTag('main', chainName))
  );

  return { name: 'forge', pid: forgeProcess ? forgeProcess.pid : 0 };
}

async function getAllForgeProcesses(chainNames) {
  const forgeProcesses = await findProcess('name', 'forge');

  return forgeProcesses
    .filter(
      ({ cmd }) =>
        cmd.includes('/bin/beam.smp') &&
        chainNames.find(chainName => cmd.includes(getProcessTag('main', chainName)))
    )
    .map(tmp => ({ name: 'forge', pid: tmp.pid }));
}

async function getForgeWebProcess(chainName) {
  const list = await findProcess('name', 'forge-web');
  const match = list.find(
    ({ name, cmd }) => name === 'beam.smp' && cmd.includes(getProcessTag('web', chainName))
  );

  return { name: 'forge web', pid: match ? match.pid : 0 };
}

async function getRunningProcesses(chainName) {
  debug('get running processes');
  const processes = await Promise.all([
    getForgeProcess(chainName),
    getForgeWebProcess(chainName),
    getTendermintProcess(chainName),
    getSimulatorProcess(chainName),
  ]);

  return processes.filter(({ pid }) => pid > 0);
}

async function getRunningProcessesStats(chainName = process.env.PROFILE_NAME) {
  const processes = await getRunningProcesses(chainName);

  const processesUsage = await Promise.all(
    processes.map(async item => {
      item.usage = await pidUsage(item.pid);

      return item;
    })
  );

  const processesStats = processesUsage.map(({ pid, name, usage }) => ({
    name,
    pid,
    uptime: prettyTime(usage.elapsed, { compact: true }),
    memory: prettyBytes(usage.memory),
    cpu: `${usage.cpu.toFixed(2)} %`,
  }));

  return processesStats;
}

async function getSimulatorProcess(appName) {
  const processes = await findProcess('name', 'simulator');

  const tmp = processes.find(
    ({ cmd }) => cmd.includes('/bin/beam.smp') && cmd.includes(getProcessTag('simulator', appName))
  );

  return { name: 'simulator', pid: tmp ? tmp.pid : 0 };
}

async function getAllRunningProcessStats() {
  const processes = [];
  const allAppNames = getAllAppNames();

  // eslint-disable-next-line
  for (const appName of allAppNames) {
    // eslint-disable-next-line
    const tmp = await getRunningProcessesStats(appName);
    if (tmp && tmp.length) {
      processes.push({ name: appName, value: tmp });
    }
  }

  return processes.sort(processSortHandler);
}

async function getAllProcesses() {
  const processes = [];
  const allAppNames = getAllAppNames();

  // eslint-disable-next-line
  for (const appName of allAppNames) {
    // eslint-disable-next-line
    const tmp = await getRunningProcesses(appName);
    if (tmp && tmp.length) {
      processes.push({ name: appName, value: tmp });
    }
  }

  processes.sort(processSortHandler);

  return processes;
}

async function getAllRunningProcesses() {
  const processes = await getAllProcesses();

  return processes.reduce((acc, { value }) => acc.concat(...value), []);
}

/* eslint-disable*/
async function stopProcesses(runningProcesses = []) {
  if (!runningProcesses || !runningProcesses.length) {
    return [];
  }

  const processIds = runningProcesses.map(tmp => tmp.pid).filter(Boolean);
  if (!processIds.length) {
    debug('no running chains');
    return;
  }

  const killCommand = `kill ${processIds.join(' ')}`;
  debug(`kill command: "${killCommand}"`);
  shell.exec(killCommand, { silent: true });
  await sleep(5000);

  return runningProcesses;
}

async function stopAllForgeProcesses() {
  const empdProcess = await findForgeEpmdDeamon();
  const processes = await getAllRunningProcesses();

  return stopProcesses([...processes, empdProcess]);
}

async function stopForgeProcesses(chainName) {
  assert.equal(!!chainName, true, `chainNmae can't be empty`);

  const allChainNames = await getAllAppNames();
  const forgeProcesses = await getAllForgeProcesses(allChainNames);

  if (!forgeProcesses.length) {
    return [];
  }

  if (forgeProcesses.length === 1) {
    return stopAllForgeProcesses();
  }

  const runningProcesses = await getRunningProcesses(chainName || process.env.PROFILE_NAME);
  return stopProcesses(runningProcesses);
}

module.exports = {
  getAllProcesses,
  getAllRunningProcesses,
  getAllRunningProcessStats,
  getRunningProcesses,
  findServicePid,
  isForgeStarted,
  getForgeProcess,
  getForgeWebProcess,
  getProcessTag,
  getSimulatorProcess,
  stopAllForgeProcesses,
  stopForgeProcesses,
};
