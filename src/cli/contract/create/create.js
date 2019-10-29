const fs = require('fs');
const path = require('path');
const { print, printError, printSuccess } = require('core/util');
const { inquire } = require('core/libs/interaction');

const WILL_BE_CREATED_FILES = ['config.yml', 'protocol.proto', 'protocol.yml'];
const generateConfigViaTemplate = ({ name = '', description = '' }) => `---
name: ${name}
version: 1
tags: []
namespace: CoreTx
description: ${description}
type_urls:
  fg:t:create_demo: ForgeAbi.CreateDemoTx
proto: protocol.proto
pipeline: protocol.yml
sources: []
`;

const generateProtocolViaTemplate = (name = '') => `---
name: ${name}
check: []
verify: []
update: []
`;

const generateProtocolProtoViaTemplate = () => `
syntax = "proto3";
package forge_abi;

message CreateDemoTx {
  Demo demo = 1;
}

message Demo {
  string name = 1;
}
`;

const validateContractName = (name = '') => {
  if (!/^[a-zA-Z][a-zA-Z0-9_]{2,23}$/.test(name)) {
    return 'Transaction contract name should start with a letter, only contain 0-9,a-z,A-Z, and length between 3~24';
  }

  return true;
};

const validateContractDescription = (description = '') => {
  if (!description || !description.trim) {
    return 'Transaction contract description shall a string';
  }

  if (description.trim().length < 10) {
    return 'Transaction contract description shall be at least 10 characters';
  }

  return true;
};

const ensureFileNotExists = (fileNames = [], dir) => {
  if (typeof files === 'string') {
    files = [files]; // eslint-disable-line
  }

  fileNames.forEach(fileName => {
    if (fs.existsSync(path.join(dir, fileName))) {
      throw new Error(`File ${fileName} already exists`);
    }
  });
};

async function execute({ destDir = process.cwd(), name = '', description = '' }) {
  ensureFileNotExists(WILL_BE_CREATED_FILES, destDir);

  name = name.trim(); // eslint-disable-line
  description = description.trim(); // eslint-disable-line

  const nameValidateRes = validateContractName(name);
  if (nameValidateRes !== true) {
    throw new Error(nameValidateRes);
  }

  const descValidateRes = validateContractDescription(description);
  if (descValidateRes !== true) {
    throw new Error(descValidateRes);
  }

  fs.writeFileSync(path.join(destDir, 'protocol.proto'), generateProtocolProtoViaTemplate());
  printSuccess('File protocol.proto created...');
  fs.writeFileSync(path.join(destDir, 'protocol.yml'), generateProtocolViaTemplate(name));
  printSuccess('File protocol.yml created...');
  fs.writeFileSync(
    path.join(destDir, 'config.yml'),
    generateConfigViaTemplate({ name, description })
  );
  printSuccess('File config.yml created...');
  print();
  printSuccess('Contract directory structure is created successfully!');
}

// Run the cli interactively
async function run({
  opts: { yes, defaults, silent, contractName: name = '', contractDesc: description = '' },
}) {
  const currentDirectory = process.cwd();
  ensureFileNotExists(WILL_BE_CREATED_FILES, currentDirectory);

  if (fs.readdirSync(currentDirectory).length > 0) {
    const { confirm } = await inquire(
      [
        {
          type: 'boolean',
          name: 'confirm',
          default: true,
          message: 'Current direcotry is not empty, continue?',
        },
      ],
      { yes }
    );

    if (!confirm) {
      printError('Abort!');
      process.exit(1);
    }
  }

  const questions = [];
  if (!name) {
    questions.push({
      type: 'text',
      name: 'name',
      message: 'Please input transaction contract name:',
      validate: validateContractName,
    });
  }
  if (!description) {
    questions.push({
      type: 'text',
      name: 'description',
      message: 'Please input transaction contract description:',
      validate: validateContractDescription,
    });
  }

  const data = { name, description };
  if (questions.length > 0) {
    const answers = await inquire(questions, { silent, defaults });

    data.name = data.name || answers.name;
    data.description = data.description || answers.description;
  }

  execute(data);
}

exports.run = run;
exports.execute = execute;