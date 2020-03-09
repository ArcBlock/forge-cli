const childProcess = require('child_process');
const fsExtra = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const { isDirectory, isEmptyDirectory } = require('core/forge-fs');
const { printInfo } = require('core/util');

const TEMPLATES_FIELD_NAME = 'templates';

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
      if (isDirectory(f)) {
        t = path.join(t, f);
      }

      fsExtra.copySync(path.join(sourceRoot, f), t);
    });
  } else {
    fsExtra.copySync(path.join(sourceRoot, file), target);
  }
};

class BaseHandler {
  constructor({ blockletConfig, targetDir, blockletDir }) {
    this.blockletConfig = blockletConfig;
    this.blockletDir = blockletDir;
    this.targetDir = targetDir;
  }

  execExitOnError(cmd, options) {
    const opt = JSON.parse(JSON.stringify(options));
    opt.stdio = 'inherit';
    const env = { FORGE_BLOCKLET_TARGET_DIR: this.targetDir };
    if (opt.env) {
      Object.assign(env, opt.env);
    }

    opt.env = Object.assign(process.env, env);

    childProcess.execSync(cmd, opt);
  }

  verify() {
    if (!this.blockletConfig) {
      throw new Error('There is no blocklet.json');
    }

    if (!this.blockletConfig[TEMPLATES_FIELD_NAME]) {
      throw new Error(`There is no ${TEMPLATES_FIELD_NAME} in blocklet config`);
    }

    if (!this.blockletConfig.composable && !isEmptyDirectory(this.targetDir)) {
      throw new Error(`Target directory ${chalk.cyan(this.targetDir)} is not empty`);
    }
  }

  async handle() {
    const { 'install-scripts': scripts = {}, hooks = {} } = this.blockletConfig;
    if (!hooks) {
      printInfo('No hooks');
      return;
    }

    if (scripts['install-dependencies']) {
      printInfo('install-dependencies:custom');

      this.execExitOnError(`${scripts['install-dependencies']}`, {
        cwd: this.blockletDir,
      });
    } else if (fsExtra.existsSync(path.join(this.blockletDir, 'package.json'))) {
      printInfo('install-dependencies:npm');

      this.execExitOnError('npm install', {
        cwd: this.blockletDir,
      });
    }

    if (hooks['pre-copy']) {
      this.execExitOnError(hooks['pre-copy'], { cwd: this.blockletDir });
    }

    copyFiles(this.blockletDir, this.blockletConfig[TEMPLATES_FIELD_NAME], this.targetDir);

    if (hooks['post-copy']) {
      this.execExitOnError(hooks['post-copy'], {
        cwd: this.targetDir,
      });
    }

    if (hooks.configure) {
      this.execExitOnError(hooks.configure, {
        cwd: this.blockletDir,
      });
    }

    if (hooks['on-complete']) {
      this.execExitOnError(hooks['on-complete'], {
        cwd: this.blockletDir,
      });
    }
  }
}

module.exports = BaseHandler;
module.exports.TEMPLATES_FIELD_NAME = TEMPLATES_FIELD_NAME;
