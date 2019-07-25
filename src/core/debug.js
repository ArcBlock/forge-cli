const debug = require('debug');

module.exports = name => debug(`@arcblock/cli:${name || 'info'}`);
