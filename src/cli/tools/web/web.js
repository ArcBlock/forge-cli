/* eslint no-case-declarations:"off" */
const detectPort = require('detect-port');
const shell = require('shelljs');
const pm2 = require('pm2');

const { printError, printInfo, printWarning } = require('core/util');
const { getTopRunningChains } = require('core/forge-process');

const { DEFAULT_CHAIN_NODE_PORT } = require('../../../constant');

async function main({
  args: [action = 'none'],
  opts: { chainName = process.env.FORGE_CURRENT_CHAIN } = {},
}) {
  /* eslint-disable indent */
  switch (action) {
    case 'none':
      shell.exec('forge web -h --color always');
      break;
    case 'start':
      printWarning('Not implement yet');
      break;
    case 'stop':
      printWarning('Not implement yet');
      break;
    case 'open':
      const pm2Id = 'arc-forge-web';
      const cName = chainName || (await getTopRunningChains());

      const openBrowser = (port, network) => {
        let url = `http://localhost:${port}`;
        if (cName) {
          url += `?network=${network}`;
        }
        printInfo(`Opening ${url}`);
        shell.exec(`open ${url}`);
      };

      pm2.describe(pm2Id, async (describeError, [info]) => {
        if (describeError) {
          throw describeError;
        }

        if (info && info.pm2_env && info.pm2_env.status === 'online') {
          pm2.disconnect();
          openBrowser(info.pm2_env.env.FORGE_WEB_PROT, cName);
          return;
        }

        const detectedProt = await detectPort(DEFAULT_CHAIN_NODE_PORT);
        pm2.start(
          {
            name: pm2Id,
            script: './server.js',
            max_memory_restart: '100M',
            cwd: __dirname,
            env: {
              FORGE_WEB_PROT: detectPort,
            },
          },
          err => {
            pm2.disconnect();

            if (err) {
              printError('Forge Web exited error', err);
              return;
            }

            printInfo(`Forge Web is listening on port ${detectedProt}`);
            openBrowser(cName, detectedProt);
          }
        );
      });

      break;
    default:
      break;
  }
  /* eslint-enable indent */
}

exports.run = main;
exports.execute = main;
exports.start = () => main({ args: ['start'] });
