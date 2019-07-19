const fs = require('fs');
const shell = require('shelljs');
const path = require('path');
const { printError } = require('../../../common');

const { CONFIG_FILE_NAME } = require('../../../constant');
const Common = require('../../../common');

function generateCurrentProfile() {
  if (fs.existsSync(CONFIG_FILE_NAME)) {
    Common.printError(
      `The config file ${CONFIG_FILE_NAME} has already exists in your current directory.`
    );
    process.exit(1);
  }

  fs.mkdirSync(path.join(CONFIG_FILE_NAME, '.forge_release'), { recursive: true });
  fs.mkdirSync(path.join(CONFIG_FILE_NAME, '.forge_cli'), { recursive: true });
  Common.print(
    `Initialized an empty storage space in ${path.join(process.cwd(), CONFIG_FILE_NAME)}`
  );
}

function main() {
  try {
    generateCurrentProfile();
  } catch (error) {
    shell.exec(`rm -rf ${CONFIG_FILE_NAME}`);
    printError('Initialize failed:');
    printError(error);
  }
}

exports.run = main;
exports.execute = main;
