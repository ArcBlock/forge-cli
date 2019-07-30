/* eslint-disable no-console */

const pidUsage = require('pidusage');
const prettyBytes = require('pretty-bytes');
const findProcess = require('find-process');
const shell = require('shelljs');

const debug = require('./debug')('forge-process');
const { getAllAppNames } = require('./forge-config');
const { getTendermintHomeDir } = require('./forge-fs');
const { prettyTime, md5, sleep } = require('./util');

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

async function isForgeStarted(appName = process.env.PROFILE_NAME) {
  const { pid } = await getTendermintProcess(appName);

  return !!pid;
}

async function getForgeProcess(appName = process.env.PROFILE_NAME) {
  const forgeProcesses = await findProcess('name', 'forge');

  const forgeProcess = forgeProcesses.find(
    ({ cmd }) => cmd.includes('/bin/beam.smp') && cmd.includes(getProcessTag('main', appName))
  );

  return { name: 'forge', pid: forgeProcess ? forgeProcess.pid : 0 };
}

async function getForgeWebProcess(appName) {
  const list = await findProcess('name', 'forge-web');
  const match = list.find(
    ({ name, cmd }) => name === 'beam.smp' && cmd.includes(getProcessTag('web', appName))
  );

  return { name: 'forge web', pid: match ? match.pid : 0 };
}

async function getRunningProcesses(appName) {
  debug('get running processes');

  const processes = await Promise.all([
    getForgeProcess(appName),
    getForgeWebProcess(appName),
    getTendermintProcess(appName),
    getSimulatorProcess(appName),
  ]);

  return processes.filter(({ pid }) => pid > 0);
}

async function getRunningProcessesStats(appName = process.env.PROFILE_NAME) {
  const processes = await getRunningProcesses(appName);

  const processesUsage = await Promise.all(
    processes.map(async item => {
      item.usage = await pidUsage(item.pid);

      return item;
    })
  );

  const processesStats = processesUsage
    .map(({ pid, name, usage }) => ({
      name,
      pid,
      uptime: prettyTime(usage.elapsed, { compact: true }),
      memory: prettyBytes(usage.memory),
      cpu: `${usage.cpu.toFixed(2)} %`,
    }))
    .sort((x, y) => {
      if (x.name > y.name) {
        return 1;
      }
      if (x.name < y.name) {
        return -1;
      }

      return 0;
    });

  return processesStats;
}

async function getSimulatorProcess(appName) {
  const processes = await findProcess('name', 'simulator');

  const tmp = processes.find(
    ({ cmd }) => cmd.includes('/bin/beam.smp') && cmd.includes(getProcessTag('simulator', appName))
  );

  return { name: 'simulator', pid: tmp ? tmp.pid : 0 };
}

async function getAllRunningProcesses() {
  const processes = {};
  const allAppNames = getAllAppNames();

  // eslint-disable-next-line
  for (const appName of allAppNames) {
    // eslint-disable-next-line
    const tmp = await getRunningProcessesStats(appName);
    if (tmp.length) {
      processes[appName] = tmp;
    }
  }

  return processes;
}

/* eslint-disable*/
async function stopServices(runningProcesses = []) {
  if (!runningProcesses || !runningProcesses.length) {
    return;
  }

  const processIds = runningProcesses.map(tmp => tmp.pid);
  const killCommand = `kill ${processIds.join(' ')}`;
  debug(`kill command: "${killCommand}"`);
  shell.exec(killCommand, { silent: true });
  await sleep(5000);
}

module.exports = {
  getAllRunningProcesses,
  getRunningProcessesStats,
  findServicePid,
  isForgeStarted,
  getForgeProcess,
  getForgeWebProcess,
  getProcessTag,
  getRunningProcesses,
  getSimulatorProcess,
  stopServices,
};
