const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const shell = require('shelljs');
const fsExtra = require('fs-extra');
const isIP = require('is-ip');
const internalIP = require('internal-ip');
const toml = require('@iarna/toml');
const uniqBy = require('lodash/uniqBy');
const { getSpinner } = require('core/ui');
const { print, printInfo, printSuccess } = require('core/util');
const { config } = require('core/env');
const debug = require('core/debug')('prepare');

async function main({ opts: { mode = 'init', writeConfig = false } }) {
  const forgePath = config.get('cli.forgeBinPath');
  const tmPath = config.get('cli.tmBinPath');
  const chainRoot = config.get('cli.chainRoot');
  const configPath = config.get('cli.chainConfig');
  const chainConfig = toml.parse(fs.readFileSync(configPath).toString());

  debug('prepare', { forgePath, tmPath, chainRoot, configPath });

  const doConfigUpdate = (peerStr, validator) => {
    const peers = chainConfig.tendermint.persistent_peers
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);
    peers.push(peerStr);
    chainConfig.tendermint.persistent_peers = uniqBy(peers, x => x.split('@').shift()).join(',');
    const validators = chainConfig.tendermint.genesis.validators || [];
    validators.push(validator);
    chainConfig.tendermint.genesis.validators = uniqBy(validators, x => x.address).filter(
      x => x.address
    );
    fs.writeFileSync(configPath, toml.stringify(chainConfig));
  };

  // TODO: detect that this node has already started

  if (mode === 'init') {
    fsExtra.removeSync(`${chainRoot}/forge_release`);
    fsExtra.removeSync(`${chainRoot}/keys`);

    // 1. initialize the node using forge executable
    let command = `FORGE_CONFIG=${configPath} ${forgePath} eval 'Application.ensure_all_started(:consensus);Process.sleep(3000)'`; // eslint-disable-line
    const spinner = getSpinner('Generating node keys...');
    spinner.start();
    const { code, stderr } = shell.exec(command, { silent: true });
    if (code !== 0) {
      spinner.fail(`Node key generate error: ${stderr}`);
      process.exit(1);
      return;
    }
    spinner.succeed('Node key generated');

    // 2. create persistent_peers string
    command = `${tmPath} --home ${chainRoot}/forge_release/tendermint show_node_id`;
    debug('command', command);
    const result = shell.exec(command, { silent: true });
    if (result.code !== 0 || !result.stdout.trim()) {
      spinner.fail('Cannot get node id, abort');
      process.exit(1);
      return;
    }

    const internalIpV4 = (await internalIP.v4()) || '';

    const nodeID = result.stdout.trim();
    const nodePort = chainConfig.tendermint.sock_p2p.split(':').pop();
    const { nodeIP } = await inquirer.prompt([
      {
        type: 'text',
        name: 'nodeIP',
        message: `Please input ${chalk.cyan('IPv4')} address for this node:`,
        default: internalIpV4,
        validate: input => {
          if (!input) {
            return 'IP should not be empty';
          }

          if (!isIP.v4(input)) {
            return 'Please input a valid IPv4 address';
          }

          return true;
        },
      },
    ]);
    const peerStr = `${nodeID}@${nodeIP}:${nodePort}`;
    printSuccess('Peer connection string generated');
    printInfo(`Peer connection string: ${peerStr}`);

    // 3. create validator item
    const validatorFile = path.join(chainRoot, 'keys', 'priv_validator_key.json');
    const validatorJson = JSON.parse(fs.readFileSync(validatorFile).toString());
    const validator = {
      address: validatorJson.address,
      name: chainConfig.tendermint.moniker,
      // 不要改成数字，否则 tendermint 起不来
      power: '1000',
      pub_key: {
        type: validatorJson.pub_key.type,
        value: validatorJson.pub_key.value,
      },
    };
    printInfo('Validator config', validator);

    // 4. Write new config to chain config
    if (writeConfig) {
      doConfigUpdate(peerStr, validator);
      printSuccess('Chain config updated');
    } else {
      printSuccess('Chain config for other peers:');
      print(toml.stringify({ tendermint: { genesis: { validators: [validator] } } }));
    }

    // 5. cleanup the generated mess
    fsExtra.removeSync(`${chainRoot}/forge_release/tendermint`);
    fsExtra.removeSync(`${chainRoot}/forge_release/core`);
    fsExtra.removeSync(`${chainRoot}/forge_release/cache`);
    shell.exec(`mkdir -p ${chainRoot}/forge_release/tendermint/data`);
    fs.writeFileSync(
      `${chainRoot}/forge_release/tendermint/data/priv_validator_state.json`,
      JSON.stringify({
        // 不要改成数字，否则 tendermint 起不来
        height: '0',
        round: '0',
        step: 0,
      })
    );
    printSuccess('Chain state was reset');
  }

  if (mode === 'join') {
    const validateStr = v => {
      if (!v) {
        return 'Missing required parameter';
      }

      return true;
    };

    const { peerStr, address, name, publicKey } = await inquirer.prompt([
      {
        type: 'input',
        name: 'peerStr',
        message: 'Please peer connection string',
        default: '',
        validate: validateStr,
      },
      {
        type: 'input',
        name: 'address',
        message: 'Please peer address',
        default: '',
        validate: validateStr,
      },
      {
        type: 'input',
        name: 'name',
        message: 'Please peer name',
        default: '',
        validate: validateStr,
      },
      {
        type: 'input',
        name: 'publicKey',
        message: 'Please peer public key',
        default: '',
        validate: validateStr,
      },
    ]);

    const validator = {
      address,
      name,
      power: '1000',
      pub_key: {
        type: 'tendermint/PubKeyEd25519',
        value: publicKey,
      },
    };

    doConfigUpdate(peerStr, validator);
    printSuccess('New peer added!');
  }
}

exports.run = main;
exports.execute = main;
