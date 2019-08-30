const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const chalk = require('chalk');
const { config, isEmptyDirectory } = require('core/env');
const debug = require('core/debug')('list');
const { isDirectory } = require('core/forge-fs');
const { print, printError } = require('core/util');

const { RELEASE_ASSETS } = require('../../../constant');

function printList(title, list = [], current) {
  print(`${title}:`);
  if (list.length === 0) {
    print('  -');
  } else {
    list.forEach(x => print(x === current ? chalk.cyan(`  ✓ ${x}`) : `  - ${x}`));
  }
  print();
}

function listReleases() {
  const { release } = config.get('cli').requiredDirs;
  return RELEASE_ASSETS.reduce((acc, x) => {
    const dir = path.join(release, x);
    if (fs.existsSync(dir)) {
      acc[x] = fs
        .readdirSync(dir)
        .filter(y => isDirectory(path.join(dir, y)) && !isEmptyDirectory(path.join(dir, y)));
    }

    return acc;
  }, {});
}

function main() {
  let current = '';
  try {
    const { release } = config.get('cli').requiredDirs;
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
