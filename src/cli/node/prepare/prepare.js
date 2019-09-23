// const fuzzy = require('fuzzy');
const inquirer = require('inquirer');
const shell = require('shelljs');
// const { print, printError, printInfo, printSuccess } = require('core/util');
const { config } = require('core/env');

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

// const questions = [
//   {
//     type: 'text',
//     name: 'PARAMETER_1', // For primtive type parameter
//     message: 'Please write concise description:',
//     validate: input => {
//       if (!input || input.length < 10) return 'Description should be more than 10 characters long';
//       return true;
//     },
//   },
//   {
//     type: 'autocomplete',
//     name: 'PARAMETER_2', // For array type parameter
//     message: 'Choose from a list:',
//     source: (anwsers, inp) => {
//       const input = inp || '';
//       return new Promise(resolve => {
//         const result = fuzzy.filter(input, templates);
//         resolve(result.map(item => item.original));
//       });
//     },
//   },
// ];

async function main({ args: [endpoint = ''], opts: { yes, chainName } }) {
  const binPath = config.get('cli.forgeBinPath');
  const command = `env -i HOME=$HOME SHELL=$SHELL PATH=$PATH ${binPath} eval 'Application.ensure_all_started(:consensus)'`;
  const { code, stdout, stderr } = shell.exec(command);
  console.log({ code, stdout, stderr });
}

exports.run = main;
exports.execute = main;
