const axios = require('axios');
const chalk = require('chalk');
const { print, printInfo, logError } = require('core/util');
const { getSpinner } = require('core/ui');
const globalConfig = require('core/libs/global-config');

const { REMOTE_BLOCKLET_URL, REMOTE_BLOCKLET_URL_NETLIFY } = require('../../../constant');

const getBlocklets = async registry => {
  const spinner = getSpinner('Fetching blocklets information...');
  const url = registry || globalConfig.getConfig('blockletRegistry') || REMOTE_BLOCKLET_URL;
  printInfo('Blocklets information registry:', url);
  try {
    spinner.start();
    const { data } = await axios.get(url);
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('load blocklets configs failed');
    }
    spinner.succeed('Fetching blocklets information succeed');
    return data.filter(x => ['starter'].includes(x.group));
  } catch (error) {
    spinner.fail('Fetching blocklets information failed');
    print();
    printInfo('You can try with the following blocklet registries:');
    printInfo(`China: ${chalk.cyan(`${REMOTE_BLOCKLET_URL}`)}`);
    printInfo(`Global: ${chalk.cyan(`${REMOTE_BLOCKLET_URL_NETLIFY}`)}`);
    print();

    logError(error);
    throw new Error('load blocklets configs failed');
  }
};

module.exports = { getBlocklets };
