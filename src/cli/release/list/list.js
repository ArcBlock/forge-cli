const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const chalk = require('chalk');
const debug = require('core/debug')('list');
const { print, printError } = require('core/util');
const { listReleases } = require('core/forge-fs');

const { REQUIRED_DIRS } = require('../../../constant');

function printList(title, list = [], current) {
  print(`${title}:`);
  if (list.length === 0) {
    print('  -');
  } else {
    list.forEach(x => print(x === current ? chalk.cyan(`  ✓ ${x}`) : `  - ${x}`));
  }
  print();
}

function main() {
  let current = '';
  try {
    const { release } = REQUIRED_DIRS;
    if (fs.existsSync(path.join(release, 'forge')) === false) {
      printError(`Forge release not found, please run ${chalk.cyan('forge install')} first`);
      process.exit(1);
      return;
    }
    const filePath = path.join(release, 'forge', 'release.yml');
    const yamlObj = fs.existsSync(filePath)
      ? yaml.parse(fs.readFileSync(filePath).toString()) || {}
      : {};
    // eslint-disable-next-line prefer-destructuring
    current = yamlObj.current;
  } catch (err) {
    debug.error(err);
  }

  try {
    const {
      forge,
      simulator,
      forge_starter: starter,
      forge_web: forgeWeb,
      forge_workshop: forgeWorkshop,
    } = listReleases();
    debug({ forge, starter, simulator, current, forgeWeb, forgeWorkshop });

    printList('Forge Kernel', forge, current);
    printList('Forge Web', forgeWeb, current);
    printList('Simulator', simulator, current);
    printList('Starter', starter, current);
    printList('Workshop', forgeWorkshop, current);
  } catch (err) {
    debug(err);
    printError(
      `Cannot list installed forge releases, ensure you have run ${chalk.cyan(
        'forge download'
      )} first`
    );

    process.exit(1);
  }
}

exports.run = main;
exports.execute = main;
exports.listReleases = listReleases;
