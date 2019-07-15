/* eslint-disable no-console */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

(async () => {
  const packageFile = path.join(__dirname, '../package.json');
  if (fs.existsSync(packageFile)) {
    const json = require(packageFile);
    try {
      const res = await axios.put(`https://npm.taobao.org/sync/${json.name}?sync_upstream=true`);
      console.log('trigger cnpm sync success', json.name, res.data);
    } catch (err) {
      console.error('trigger cnpm sync failed', json.name, err);
    }
  }
})();
