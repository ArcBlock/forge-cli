const axios = require('axios').default; // https://github.com/axios/axios#note-commonjs-usage

const create = (config = {}) => {
  if (typeof config.timeout === 'undefined') {
    config.timeout = 60 * 1000;
  }

  const instance = axios.create(config);

  return instance;
};

module.exports = { api: create(), create };
