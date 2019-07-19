const shell = require('shelljs');
const { cli, action } = require('core/cli');
const { execute, run } = require('./init');

cli('init', 'Create an empty space to store forge data', input => action(execute, run, input), {
  requirements: {
    forgeRelease: true,
    rpcClient: false,
    runningNode: false,
    wallet: false,
  },
  handlers: {
    '--help': () => {
      shell.echo('Create an empty space to store forge data');
    },
  },
});
