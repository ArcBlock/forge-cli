const { promisify } = require('util');
const { createVerifier } = require('@arcblock/tx-util');

const validateTx = (options, callback) => {
  const verifier = createVerifier(options);

  verifier.on('error', callback);
  verifier.on('done', data => callback(null, data));
};

const validateTxPromise = promisify(validateTx);

module.exports = { validateTx, validateTxPromise };
