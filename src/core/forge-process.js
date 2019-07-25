/* eslint-disable no-console */

const pidUsage = require('pidusage');
const path = require('path');
const pidUsageTree = require('pidusage-tree');
const prettyBytes = require('pretty-bytes');
const findProcess = require('find-process');
const debug = require('debug')('forge-process');

const { prettyTime } = require('../common');
const { getTendermintHomeDir } = require('./forge-fs');
const { getForgeProcessTag } = require('./util');

async function findServicePid(n) {
  const list = await findProcess('name', n);
  const match = list.find(x => x.name === 'beam.smp');
  return match ? match.pid : 0;
}

async function getRunningProcesses() {
  try {
    const processNames = ['workshop', 'simulator', 'forge_web'];
    const processIds = await Promise.all(
      processNames.map(processName => findServicePid(processName))
    );

    const processesMap = {};
    processNames.forEach((processName, index) => {
      if (processName) {
        processesMap[processIds[index]] = processName;
      }
    });

    const processes = await Promise.all(processIds.filter(Boolean).map(pid => pidUsage(pid)));

    const processesStats = processes.map(x => ({
      name: processesMap[x.pid],
      pid: x.pid,
      uptime: prettyTime(x.elapsed, { compact: true }),
      memory: prettyBytes(x.memory),
      cpu: `${x.cpu.toFixed(2)} %`,
    }));

    const forgeProcessStats = await getForgeProcesses();

    // sort by name asc
    return [...processesStats, ...forgeProcessStats].sort((x, y) => {
      if (x.name > y.name) {
        return 1;
      }
      if (x.name < y.name) {
        return -1;
      }

      return 0;
    });
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function getForgeProcesses() {
  const pid = await findServicePid('forge_starter');
  if (!pid) {
    return [];
  }

  debug(`forge pid: ${pid}`);
  try {
    const processes = await pidUsageTree(pid);
    const results = await Promise.all(
      Object.values(processes).map(async x => {
        try {
          const [info] = await findProcess('pid', x.pid);
          Object.assign(x, info);
          debug('forge managed process info: ', x);
        } catch (err) {
          console.error(`Error getting pid info: ${x.pid}`, err);
        }

        return x;
      })
    );

    const getProcessName = x => {
      if (x.cmd.indexOf('/forge_starter/') > 0 && x.cmd.indexOf('/bin/beam.smp') > 0) {
        return 'starter';
      }

      if (x.cmd.indexOf('/forge/') > 0 && x.cmd.indexOf('/bin/beam.smp') > 0) {
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
        uptime: prettyTime(x.elapsed),
        memory: prettyBytes(x.memory),
        cpu: `${x.cpu.toFixed(2)} %`,
      }));
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function getTendermintProcess(homeDir) {
  const tendermintProcess = await findProcess('name', 'tendermint');
  return tendermintProcess.find(({ cmd }) => cmd.includes(homeDir));
}

async function isForgeStarted() {
  const tendermintProcess = await getTendermintProcess(getTendermintHomeDir());

  return !!tendermintProcess;
}

async function getForgeProcess() {
  const forgeProcesses = await findProcess('name', 'forge');

  const forgeProcess = forgeProcesses.find(
    ({ cmd }) =>
      cmd.includes('/bin/beam.smp') &&
      cmd.includes(getForgeProcessTag(process.env.CURRENT_WORKING_PROFILE))
  );

  return forgeProcess ? forgeProcess.pid : null;
}

module.exports = { getRunningProcesses, findServicePid, isForgeStarted, getForgeProcess };
