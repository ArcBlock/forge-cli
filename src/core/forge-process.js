/* eslint-disable no-console */
const assert = require('assert');
const pidUsage = require('pidusage');
const prettyBytes = require('pretty-bytes');
const findProcess = require('find-process');
const { get } = require('lodash');
const shell = require('shelljs');

const debug = require('./debug')('forge-process');
const { getTendermintHomeDir, getAllChainNames } = require('./forge-fs');
const { readChainConfig } = require('./forge-config');
const { prettyTime, md5, strEqual, sleep, chainSortHandler } = require('./util');

const sortHandler = (x, y) => chainSortHandler(x.name, y.name);

const getProcessTag = (name, chainName = process.env.FORGE_CURRENT_CHAIN) => {
  if (!name) {
    return `forge-${md5(chainName)}`;
  }

  return `forge-${name}-${md5(chainName)}`;
};

async function findServicePid(n) {
  const list = await findProcess('name', n);
  const match = list.find(x => x.name === 'beam.smp');
  return match ? match.pid : 0;
}

async function getTendermintProcess(chainName) {
  const homeDir = getTendermintHomeDir(chainName);
  const tendermintProcess = await findProcess('name', 'tendermint');

  const tmp = tendermintProcess.find(({ cmd }) => cmd.includes(homeDir));
  return { name: 'tendermint', pid: tmp ? tmp.pid : 0 };
}

async function findForgeEpmdDeamon() {
  const tendermintProcess = await findProcess('name', 'epmd');

  const tmp = tendermintProcess.find(({ cmd }) => cmd.includes('forge'));
  return { name: 'forge-epmd', pid: tmp ? tmp.pid : 0 };
}

async function isForgeStarted(chainName = process.env.FORGE_CURRENT_CHAIN) {
  const { pid } = await getTendermintProcess(chainName);

  return !!pid;
}

async function isForgeStopped(chainName = process.env.FORGE_CURRENT_CHAIN) {
  return !isForgeStarted(chainName);
}

async function getForgeProcessByTag(processName, chainName = process.env.FORGE_CURRENT_CHAIN) {
  const forgeProcesses = await findProcess('name', processName);

  const forgeProcess = forgeProcesses.find(
    ({ cmd }) =>
      cmd.includes('/bin/beam.smp') && cmd.includes(getProcessTag(processName, chainName))
  );

  return { name: processName, pid: forgeProcess ? forgeProcess.pid : 0 };
}

async function getForgeProcess(chainName = process.env.CHAIN_NAME) {
  const forgeProcesses = await findProcess('name', 'forge');

  const forgeProcess = forgeProcesses.find(
    ({ cmd }) => cmd.includes('/bin/beam.smp') && cmd.includes(getProcessTag('forge', chainName))
  );

  return { name: 'forge', pid: forgeProcess ? forgeProcess.pid : 0 };
}

async function getForgeWebProcess(chainName) {
  return getForgeProcessByTag('web', chainName);
}

async function getForgeWorkshopProcess(chainName) {
  return getForgeProcessByTag('workshop', chainName);
}

async function getSimulatorProcess(chainName) {
  return getForgeProcessByTag('simulator', chainName);
}

async function getRunningProcesses(chainName) {
  debug('get running processes');
  const processes = await Promise.all([
    getForgeProcess(chainName),
    getForgeWebProcess(chainName),
    getTendermintProcess(chainName),
    getSimulatorProcess(chainName),
    getForgeWorkshopProcess(chainName),
  ]);

  return processes.filter(({ pid }) => pid > 0);
}

async function getRunningProcessesStats(chainName = process.env.FORGE_CURRENT_CHAIN) {
  const processes = await getRunningProcesses(chainName);

  const processesUsage = await Promise.all(
    processes.map(async item => {
      item.usage = await pidUsage(item.pid);

      return item;
    })
  );

  const ports = await getRunningProcessEndpoints(chainName);
  const processesStats = processesUsage.map(({ pid, name, usage }) => {
    const port = ports[name] || '-';

    return {
      name,
      pid,
      uptime: prettyTime(usage.elapsed, { compact: true }),
      memory: prettyBytes(usage.memory),
      cpu: `${usage.cpu.toFixed(2)} %`,
      port,
    };
  });

  return processesStats;
}

async function getRunningProcessEndpoints(chainName) {
  const processes = await getRunningProcesses(chainName);
  const cfg = readChainConfig(chainName);
  const result = {};
  processes.forEach(({ name }) => {
    if (strEqual(name, 'web')) {
      result[name] = `http://127.0.0.1:${get(cfg, 'forge.web.port')}`;
    } else if (strEqual(name, 'forge')) {
      const grpcUri = get(cfg, 'forge.sock_grpc', '');
      result[name] = `${grpcUri}`;
    } else if (strEqual(name, 'workshop')) {
      result[name] = `http://127.0.0.1:${get(cfg, 'workshop.port')}`;
    }
  });

  return result;
}

async function getAllRunningProcessStats() {
  const processes = [];
  const allChains = getAllChainNames();

  // eslint-disable-next-line
  for (const [name, config] of allChains) {
    // eslint-disable-next-line
    const tmp = await getRunningProcessesStats(name);
    if (tmp && tmp.length) {
      processes.push({ name, value: tmp, config });
    }
  }

  return processes.sort(sortHandler);
}

async function getAllProcesses() {
  const processes = [];
  const allChains = getAllChainNames();

  // eslint-disable-next-line
  for (const [name, config] of allChains) {
    // eslint-disable-next-line
    const tmp = await getRunningProcesses(name);
    if (tmp && tmp.length) {
      processes.push({ name, value: tmp, config });
    }
  }

  processes.sort(sortHandler);

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

  const runningChains = await getAllRunningProcessStats();

  if (!runningChains.length) {
    return [];
  }

  if (runningChains.length === 1) {
    return stopAllForgeProcesses();
  }

  const runningProcesses = runningChains.find(x => chainName === x.name);
  let processes = [];
  if (runningProcesses) {
    processes = runningProcesses.value;
  }
  return stopProcesses(processes);
}

module.exports = {
  findServicePid,
  isForgeStopped,
  isForgeStarted,
  getAllProcesses,
  getAllRunningProcesses,
  getAllRunningProcessStats,
  getRunningProcesses,
  getForgeProcess,
  getForgeWebProcess,
  getForgeWorkshopProcess,
  getRunningProcessEndpoints,
  getProcessTag,
  getSimulatorProcess,
  stopAllForgeProcesses,
  stopForgeProcesses,
};
