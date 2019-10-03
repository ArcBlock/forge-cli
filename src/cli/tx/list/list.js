const { createRpcClient } = require('core/env');
const { toBase64 } = require('@arcblock/forge-util');
const { pretty } = require('core/ui');
const { print } = require('core/util');

async function main() {
  const client = createRpcClient();
  const res = await client.listTransactions();
  const transactions = res.transactionsList.map(transaction => {
    transaction.tx.pk = toBase64(transaction.tx.pk);
    transaction.tx.signature = toBase64(transaction.tx.signature);
    transaction.tx.signaturesList.forEach(signature => {
      signature.signature = toBase64(signature.signature);
    });

    return transaction;
  });
  print(pretty(transactions));
}

exports.run = main;
exports.execute = main;
