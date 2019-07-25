const crypto = require('crypto');

const md5 = data =>
  crypto
    .createHash('md5')
    .update(data)
    .digest('hex');

const getForgeProcessTag = str => `forge-${md5(str)}`;

module.exports = { md5, getForgeProcessTag };
