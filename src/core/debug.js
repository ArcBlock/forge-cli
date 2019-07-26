/* eslint-disable no-console */

const debug = require('debug');

module.exports = name => {
  const tmp = debug(`@arcblock/cli:${name || 'info'}`);
  tmp.error = (...args) => {
    if (debug.enabled) {
      console.error(...args);
    }
  };
  return tmp;
};
