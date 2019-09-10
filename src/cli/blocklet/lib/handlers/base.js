const childProcess = require('child_process');
const fsExtra = require('fs-extra');
const path = require('path');
const { isDirectory } = require('core/forge-fs');
const { printInfo } = require('core/util');

const TEMPLATES_FIELD_NAME = 'templates';

const runInstallationScripts = (scripts = {}, { cwd }) => {
  if (scripts['install-dependencies']) {
    childProcess.execSync(`${scripts['install-dependencies']} --color always`, {
      stdio: 'inherit',
      cwd,
    });
  }
};

/**
 *
 * @param {string|array} source
 * @param {string} target
 */
const copyFiles = (sourceRoot, file, target) => {
  const files = file;
  if (Array.isArray(file)) {
    files.forEach(f => {
      let t = target;
      if (isDirectory) {
        t = path.join(t, f);
      }

      fsExtra.copySync(path.join(sourceRoot, f), t);
    });
  } else {
    fsExtra.copySync(path.join(sourceRoot, file), target);
  }
};

class BaseHandler {
  constructor(blockletConfig) {
    this.blockletConfig = blockletConfig;
  }

  verify() {
    if (!this.blockletConfig) {
      throw new Error('There is no blocklet.json');
    }
  }

  async handle({ cwd }) {
    const { 'install-scripts': scripts, hooks = {} } = this.blockletConfig;
    if (!hooks) {
      printInfo('No hooks');
      return;
    }

    if (hooks['pre-copy']) {
      childProcess.execSync(hooks['pre-copy'], { stdio: 'inherit', cwd: process.cwd() });
    }

    copyFiles(cwd, this.blockletConfig[TEMPLATES_FIELD_NAME], process.cwd());

    runInstallationScripts(scripts, { cwd, targetDir: process.cwd() });

    if (hooks.configure) {
      childProcess.execSync(hooks.configure, {
        stdio: 'inherit',
        cwd,
        env: Object.assign(process.env, { FORGE_BLOCKLET_TARGET_DIR: process.cwd() }),
      });
    }

    if (hooks['post-copy']) {
      childProcess.execSync(hooks['post-copy'], { stdio: 'inherit', cwd: process.cwd() });
    }

    if (hooks['on-complete']) {
      childProcess.execSync(hooks['on-complete'], { stdio: 'inherit', cwd });
    }
  }
}

module.exports = BaseHandler;
module.exports.TEMPLATES_FIELD_NAME = TEMPLATES_FIELD_NAME;
