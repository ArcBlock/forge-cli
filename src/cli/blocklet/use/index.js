// eslint-disable-next-line import/no-unresolved
const chalk = require('chalk');
const { cli, action } = require('core/cli');
const { print } = require('core/util');

const { execute, run } = require('./use');

cli('blocklet:use', 'Download and install a blocklet', input => action(execute, run, input), {
  requirements: {
    forgeRelease: false,
    runningNode: false,
    rpcClient: false,
    wallet: false,
    chainName: false,
    chainExists: false,
  },
  options: [
    ['--target <target>', 'Target directory, default is current directory'],
    ['--local-blocklet <localBlocklet>', 'Local blocklet directory'],
    ['-b --blocklet-registry <blockletRegistry>', 'Blocklet registry'],
  ],
  handlers: {
    '--help': () => {
      print(`
Examples:
  - ${chalk.cyan(
    'forge blocklet:use forge-react-starter'
  )}           init a dApp base on forge-react-starter blocklet interactively
  - ${chalk.cyan(
    'forge blocklet:use forge-react-starter --yes'
  )}      init a dApp base on forge-react-starter blocklet with default settings
        `);
    },
  },
});
