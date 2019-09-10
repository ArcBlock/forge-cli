const childProcess = require('child_process');
const fsExtra = require('fs-extra');
const path = require('path');
const { isEmptyDirectory } = require('core/forge-fs');
const { printInfo } = require('core/util');

const verify = blockletConfig => {
  if (!isEmptyDirectory(process.cwd())) {
    throw new Error('Current directory is not empty');
  }

  if (!blockletConfig) {
    throw new Error('There is no sources in blocklet.json');
  }

  return true;
};

const runGenerateScripts = (scripts = {}, { cwd, targetDir }) => {
  if (scripts.installDependencies) {
    childProcess.execSync(`${scripts.installDependencies} --color always`, {
      stdio: 'inherit',
      cwd,
    });
  }

  if (scripts.generate) {
    childProcess.execSync(scripts.generate, {
      stdio: 'inherit',
      cwd,
      env: Object.assign(process.env, { TARGET_DIR: targetDir }),
    });
  }
};

/**
 *
 * @param {string|array} source
 * @param {string} target
 */
const copyFiles = (sourceRoot, file, target) => {
  let files = file;
  if (!Array.isArray(file)) {
    files = [file];
  }

  files.forEach(f => fsExtra.copySync(path.join(sourceRoot, f), target));
};

const run = async (blockletConfig, { cwd }) => {
  const { 'generate-scripts': scripts, hooks = {} } = blockletConfig;
  if (!hooks) {
    printInfo('No hooks');
    return;
  }

  if (hooks['pre-copy']) {
    childProcess.execSync(hooks['pre-copy'], { stdio: 'inherit', cwd: process.cwd() });
  }

  copyFiles(cwd, blockletConfig.sources, process.cwd());

  runGenerateScripts(scripts, { cwd, targetDir: process.cwd() });

  if (hooks['post-copy']) {
    childProcess.execSync(hooks['post-copy'], { stdio: 'inherit', cwd: process.cwd() });
  }

  if (hooks['on-complete']) {
    childProcess.execSync(hooks['on-complete'], { stdio: 'inherit', cwd });
  }
};

module.exports = { verify, run };
