const childProcess = require('child_process');
const fsExtra = require('fs-extra');
const path = require('path');
const { isEmptyDirectory } = require('core/forge-fs');
const { printInfo } = require('core/util');

const verify = (blockletConfig, { cwd }) => {
  if (!isEmptyDirectory(process.cwd())) {
    throw new Error('Current directory is not empty');
  }

  if (!blockletConfig) {
    throw new Error('There is no sources in blocklet.json');
  }

  if (!fsExtra.existsSync(path.join(cwd, blockletConfig.sources))) {
    throw new Error('Sources path in blocklet.json is not exists');
  }

  return true;
};

const runGenerateScripts = (scripts = {}, cwd, targetDir) => {
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

const run = async (blockletConfig, { cwd }) => {
  const { 'generate-scripts': scripts, hooks = {} } = blockletConfig;
  if (!hooks) {
    printInfo('No hooks');
    return;
  }
  fsExtra.copySync(path.join(cwd, blockletConfig.sources), process.cwd());

  runGenerateScripts(scripts, { cwd, targetDir: process.cwd() });

  if (hooks['post-copy']) {
    childProcess.execSync(hooks['post-copy'], { stdio: 'inherit', cwd: process.cwd() });
  }

  if (hooks['on-complete']) {
    childProcess.execSync(hooks['on-complete'], { stdio: 'inherit', cwd });
  }
};

module.exports = { verify, run };
