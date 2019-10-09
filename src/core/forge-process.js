/* eslint-disable no-console */
const assert = require('assert');
const pidUsage = require('pidusage');
const prettyBytes = require('pretty-bytes');
const findProcess = require('find-process');
const pidTree = require('pidtree');
const { get } = require('lodash');
const path = require('path');

const debug = require('./debug')('forge-process');
const { readTendermintHomeDir, getAllChainNames, readChainConfig } = require('./forge-fs');
const {
  escapseHomeDir,
  printError,
  prettyTime,
  md5,
  strEqual,
  sleep,
  chainSortHandler,
  printWarning,
} = require('./util');
const { symbols } = require('./ui');

const sortHandler = (x, y) => chainSortHandler(x.name, y.name);

const getProcessTag = (
  name,
  chainName = process.env.FORGE_CURRENT_CHAIN,
  allowMultiChain = true
) => {
  if (!allowMultiChain && (strEqual(name, 'forge') || !name)) {
    return 'forge';
  }

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
  const result = { name: 'tendermint', pid: 0 };
  const tendermintProcess = await findProcess('name', 'tendermint');
  if (tendermintProcess.length === 0) {
    return result;
  }

  const homeDir = escapseHomeDir(readTendermintHomeDir(chainName));

  const tmp = tendermintProcess.find(({ cmd }) => cmd.includes(homeDir));
  if (tmp) {
    result.pid = tmp.pid;
  }

  return result;
}

async function findForgeEpmdDeamon() {
  const tendermintProcess = await findProcess('name', 'epmd');

  const tmp = tendermintProcess.find(({ cmd }) => cmd.includes('forge'));
  return { name: 'forge-epmd', pid: tmp ? tmp.pid : 0 };
}

async function isForgeStarted(chainName = process.env.FORGE_CURRENT_CHAIN) {
  const coreProcesses = await getCoreProcess(chainName);
  return coreProcesses.every(({ pid }) => !!pid);
}

async function isForgeStopped(chainName = process.env.FORGE_CURRENT_CHAIN) {
  return !isForgeStarted(chainName);
}

async function getForgeProcessByTag(processName, chainName = process.env.FORGE_CURRENT_CHAIN) {
  debug('getForgeProcessByTag, chain name:', chainName);
  const forgeProcesses = await findProcess('name', processName);

  const forgeProcess = forgeProcesses.find(
    ({ cmd }) =>
      cmd.includes('/bin/beam.smp') && cmd.includes(getProcessTag(processName, chainName))
  );

  return { name: processName, pid: forgeProcess ? forgeProcess.pid : 0 };
}

async function getForgeProcess(chainName = process.env.FORGE_CURRENT_CHAIN) {
  const forgeProcesses = await findProcess('name', 'forge');

  const forgeProcess = forgeProcesses.find(
    ({ cmd }) => cmd.includes('/bin/beam.smp') && cmd.includes(getProcessTag('forge', chainName))
  );

  return { name: 'forge', pid: forgeProcess ? forgeProcess.pid : 0 };
}

async function getForgeWebProcess(chainName) {
  debug('get forge web process, chain name:', chainName);
  return getForgeProcessByTag('web', chainName);
}

async function getForgeWorkshopProcess(chainName) {
  return getForgeProcessByTag('workshop', chainName);
}

async function getSimulatorProcess(chainName) {
  return getForgeProcessByTag('simulator', chainName);
}

async function getStarterProcess(chainName) {
  return getForgeProcessByTag('starter', chainName);
}

/**
 * Get processes that started by forge starter, current: forge/tendermint
 * @param {string} chainName
 */
async function getChildProcessesOfStarter(chainName) {
  const starterProcess = await getStarterProcess(chainName);
  if (starterProcess.pid === 0) {
    return { name: '', pid: 0 };
  }

  const starterChildProcesses = await pidTree(starterProcess.pid, { root: false });

  const results = await Promise.all(
    Object.values(starterChildProcesses).map(async pid => {
      try {
        const [info] = await findProcess('pid', pid);
        debug(`${symbols.info} forge managed process info: `, pid);

        if (!info) {
          return { name: '', pid: 0 };
        }

        return info;
      } catch (err) {
        printError(`Error getting pid info: ${pid}`, err);
        return { name: '', pid: 0 };
      }
    })
  );

  const getProcessName = x => {
    if (
      (x.cmd.indexOf('/forge/') > 0 && x.cmd.indexOf('/bin/beam.smp') > 0) ||
      x.cmd === '(beam.smp)' // When the forge process is about to end, its cmd is `(beam.cmp)`
    ) {
      return 'forge';
    }

    if (x.cmd.indexOf('/tendermint/') > 0) {
      return 'tendermint';
    }

    return x.name.replace(path.extname(x.name), '').replace(/^forge_/, '');
  };

  return results
    .filter(x => /(forge|tendermint|beam.smp)/.test(x.name))
    .map(x => ({
      name: getProcessName(x),
      pid: x.pid,
    }));
}

/**
 * `core processes` means `forge core`, `forge starter` and `tendermint` process.
 * @param {*} chainName
 */
async function getCoreProcess(chainName) {
  const processes = [];

  const starterProcess = await getStarterProcess(chainName);
  if (starterProcess && starterProcess.pid > 0) {
    const coreProcesses = await getChildProcessesOfStarter(chainName);
    processes.push(...coreProcesses, starterProcess);
  } else {
    const coreProcesses = await Promise.all([
      getForgeProcess(chainName),
      getTendermintProcess(chainName),
    ]);
    processes.push(...coreProcesses);
  }

  return processes;
}

async function isForgeStartedByStarter(chainName) {
  const starterProcess = await getStarterProcess(chainName);
  return starterProcess.pid > 0;
}

/**
 * Get all running processes, includes `core processes` and `normal processes`;
 * @param {*} chainName
 */
async function getRunningProcesses(chainName) {
  debug('get running processes');
  const processes = await Promise.all([
    getForgeWebProcess(chainName),
    getSimulatorProcess(chainName),
    getForgeWorkshopProcess(chainName),
  ]);

  const coreProcesses = await getCoreProcess(chainName);
  processes.push(...coreProcesses);

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
      result[name] = `http://127.0.0.1:${get(cfg, 'forge.web.port', 8210)}/api`; // forge web's default port is 8210
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

  processIds.forEach(processId => process.kill(processId));
  debug(`killed process ids: "${processIds}"`);
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

  const runningProcesses = runningChains.find(x => chainName === x.name);
  let processes = [];
  if (runningProcesses) {
    processes = runningProcesses.value;
  }
  return stopProcesses(processes);
}

async function getTopRunningChains({ chainName }) {
  if (chainName) {
    return chainName;
  }

  const allProcesses = await getAllProcesses();

  if (allProcesses.length === 0) {
    printWarning('No running processes');
    process.exit(0);
  }

  return allProcesses[0].name;
}

module.exports = {
  findServicePid,
  isForgeStopped,
  isForgeStarted,
  isForgeStartedByStarter,
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
  getTopRunningChains,
  stopAllForgeProcesses,
  stopForgeProcesses,
};
