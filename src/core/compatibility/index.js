const check = require('./upgrade-0.35.0');

module.exports = async () => {
  await check();
};
