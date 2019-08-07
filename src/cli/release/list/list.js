const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const chalk = require('chalk');
const shell = require('shelljs');
const { config, isEmptyDirectory, RELEASE_ASSETS } = require('core/env');
const debug = require('core/debug')('list');
const { isDirectory } = require('core/forge-fs');
const { symbols } = require('core/ui');

function printList(title, list, current) {
  shell.echo(`${title}:`);
  list.forEach(x => shell.echo(x === current ? chalk.cyan(`  ✓ ${x}`) : `  - ${x}`));
  shell.echo('');
}

function listReleases() {
  const { release } = config.get('cli').requiredDirs;
  return RELEASE_ASSETS.reduce((acc, x) => {
    acc[x] = fs
      .readdirSync(path.join(release, x))
      .filter(
        y => isDirectory(path.join(release, x, y)) && !isEmptyDirectory(path.join(release, x, y))
      );
    return acc;
  }, {});
}

function main() {
  let current = '';
  try {
    const { release } = config.get('cli').requiredDirs;
    if (fs.existsSync(path.join(release, 'forge')) === false) {
      shell.echo(
        `${symbols.error} forge not initialized, please run ${chalk.cyan('forge init')} first`
      );
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
    const { forge, simulator, forge_web: forgeWeb, forge_workshop: forgeWorkshop } = listReleases();
    debug({ forge, simulator, current, forgeWeb, forgeWorkshop });

    printList('Forge Kernel', forge, current);
    printList('Forge Web', forgeWeb, current);
    printList('Simulator', simulator, current);
    printList('Workshop', forgeWorkshop, current);
  } catch (err) {
    shell.echo(
      `${symbols.error} cannot list installed forge releases, ensure you have run ${chalk.cyan(
        'forge install'
      )} first`
    );
    process.exit(1);
  }
}

exports.run = main;
exports.execute = main;
exports.listReleases = listReleases;
