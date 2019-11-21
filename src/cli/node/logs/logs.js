const os = require('os');
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const { config } = require('core/env');
const debug = require('core/debug')('logs');
const { symbols } = require('core/ui');

const { REQUIRED_DIRS } = require('../../../constant');

function resolveLogPath(folder, file) {
  return folder ? path.resolve(`${folder.replace('~', os.homedir())}/${file}`) : '';
}

function findLogFiles() {
  return {
    error: resolveLogPath(
      config.get('forge.path'),
      config.get('forge.logfile', 'logs/forge_error.log')
    ),
    transaction: resolveLogPath(
      config.get('forge.path'),
      config.get('forge.logfile', 'logs/forge_transaction.log')
    ),
    tendermint: resolveLogPath(
      config.get('tendermint.path'),
      config.get('tendermint.logfile', 'logs/tendermint.log')
    ),
    cli: path.join(REQUIRED_DIRS.logs, 'error.log'),
  };
}

function tailLogFile(logs, type) {
  if (type !== 'all' && !logs[type]) {
    shell.echo(`${symbols.error} Log file for ${type} is not found!`);
    return [];
  }
  if (logs[type]) {
    if (!fs.existsSync(logs[type])) {
      shell.touch(logs[type]);
    }

    return [logs[type]];
  }

  Object.keys(logs).forEach(key => {
    if (logs[key] && !fs.existsSync(logs[key])) {
      const dirname = path.dirname(logs[key]);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }

      shell.touch(logs[key]);
    }
  });

  return Object.values(logs).filter(Boolean);
}

async function main({ args: [type = 'all'] }) {
  const logs = findLogFiles();
  debug('LogFiles', logs);
  const targetLogs = tailLogFile(logs, type);
  targetLogs.forEach(x => shell.echo(`${symbols.success} tail log ${x}`));
  shell.exec(`tail -f ${targetLogs.join(' ')}`);
}

exports.run = main;
exports.execute = main;
