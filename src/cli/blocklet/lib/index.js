const axios = require('axios');
const { printError } = require('core/util');
const { wrapSpinner } = require('core/ui');

const { REMOTE_BLOCKLET_URL } = require('../../../constant');

const getBlockletsFunc = async url => {
  try {
    const { data } = await axios.get(url);
    return data;
  } catch (error) {
    printError(error);
    return [];
  }
};

const getBlocklets = async () => {
  const result = await wrapSpinner(
    'Fetching blocklets information...',
    getBlockletsFunc,
    REMOTE_BLOCKLET_URL
  );

  return result;
};

module.exports = { getBlocklets };
