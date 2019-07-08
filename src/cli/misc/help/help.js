const shell = require('shelljs');

function main({ args: [command = ''] }) {
  if (!command) {
    shell.exec('forge -h --color always');
  }

  shell.exec(`forge ${command} -h --color always`);
}

exports.run = main;
exports.execute = main;
