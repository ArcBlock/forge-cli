const shell = require('shelljs');
const { cli, action } = require('core/cli');
const { execute, run } = require('./new');

cli('new [chainName]', 'Create a new chain instance', input => action(execute, run, input), {
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
