// eslint-disable-next-line import/no-unresolved
const { cli, action } = require('core/cli');
const { execute, run } = require('./use');

cli('blocklet:use', 'Download and install a blocklet', input => action(execute, run, input), {
  requirements: {
    forgeRelease: false,
    runningNode: false,
    rpcClient: false,
    wallet: false,
  },
  options: [['--localBlocklet <localBlocklet>', 'Local blocklet directory']],
});
