const path = require('path');
const os = require('os');

const FORGE_LOG = path.join(os.homedir(), '.forge_release', 'core', 'logs');

const getLogfile = filename => (filename ? path.join(FORGE_LOG, filename) : FORGE_LOG);

module.exports = {
  getLogfile,
};
