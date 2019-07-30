/* eslint-disable no-console */

const pidUsage = require('pidusage');
const prettyBytes = require('pretty-bytes');
const findProcess = require('find-process');
const debug = require('./debug')('forge-process');

const { prettyTime } = require('../common');
const { getTendermintHomeDir } = require('./forge-fs');
const { md5 } = require('./util');

const getProcessTag = name => {
  if (!name) {
    return `forge-${md5(process.env.PROFILE_NAME)}`;
  }

  return `forge-${name}-${md5(process.env.PROFILE_NAME)}`;
};

async function findServicePid(n) {
  const list = await findProcess('name', n);
  const match = list.find(x => x.name === 'beam.smp');
  return match ? match.pid : 0;
}

async function getTendermintProcess(homeDir = getTendermintHomeDir()) {
  const tendermintProcess = await findProcess('name', 'tendermint');

  const tmp = tendermintProcess.find(({ cmd }) => cmd.includes(homeDir));
  return { name: 'tendermint', pid: tmp ? tmp.pid : 0 };
}

async function isForgeStarted(appName = process.env.PROFILE_NAME) {
  const homeDir = getTendermintHomeDir(appName);
  const { pid } = await getTendermintProcess(homeDir);

  return !!pid;
}

async function getForgeProcess() {
  const forgeProcesses = await findProcess('name', 'forge');

  const forgeProcess = forgeProcesses.find(
    ({ cmd }) => cmd.includes('/bin/beam.smp') && cmd.includes(getProcessTag())
  );

  return { name: 'forge', pid: forgeProcess ? forgeProcess.pid : 0 };
}

async function getForgeWebProcess() {
  const list = await findProcess('name', 'forge-web');
  const match = list.find(
    ({ name, cmd }) => name === 'beam.smp' && cmd.includes(getProcessTag('web'))
  );

  return { name: 'forge web', pid: match ? match.pid : 0 };
}

async function getRunningProcesses() {
  debug('get running processes');

  const processes = await Promise.all([
    getForgeProcess(),
    getForgeWebProcess(),
    getTendermintProcess(),
    getSimulatorProcess(),
  ]);

  const processesUsage = await Promise.all(
    processes
      .filter(({ pid }) => pid > 0)
      .map(async item => {
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

async function getSimulatorProcess() {
  const processes = await findProcess('name', 'simulator');

  const tmp = processes.find(
    ({ cmd }) => cmd.includes('/bin/beam.smp') && cmd.includes(getProcessTag('simulator'))
  );

  return { name: 'simulator', pid: tmp ? tmp.pid : 0 };
}

module.exports = {
  getRunningProcesses,
  findServicePid,
  isForgeStarted,
  getForgeProcess,
  getForgeWebProcess,
  getProcessTag,
  getSimulatorProcess,
};
