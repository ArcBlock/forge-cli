/* eslint no-console:"off" */
const path = require('path');
const last = require('lodash/last');
const registryUrl = require('registry-url');

const { setupEnv } = require('./env');

const allCommands = [];

/**
 * create a cli
 *
 * @param {String} command command line
 * @param {String} desc documentation of the cli
 * @param {Function} handler cli handler
 */
function cli(
  command,
  desc,
  handler,
  { requirements = {}, options = [], alias, handlers = {} } = {}
) {
  allCommands.push({
    command,
    desc,
    handler,
    requirements,
    options,
    alias,
    handlers,
  });
}

/**
 * load the cli file
 * @param {String} file the js file to be required.
 */
function requireCli(file) {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  return require(file);
}

function initCli(program) {
  // this will mutate allCommands
  const allCli = path.join(__dirname, '../cli/index.js');
  requireCli(allCli);
  allCommands
    .sort((a, b) => {
      if (a.command > b.command) {
        return 1;
      }
      if (a.command < b.command) {
        return -1;
      }

      return 0;
    })
    .forEach(x => {
      const command = program
        .command(x.command)
        .description(x.desc)
        .allowUnknownOption();

      if (x.alias) {
        command.alias(x.alias);
      }

      (x.options || []).forEach(o => command.option(...o));

      if (Object.keys(x.handlers).length) {
        Object.keys(x.handlers).forEach(k => command.on(k, x.handlers[k]));
      }

      command.action(async (...params) => {
        const globalArgs = last(program.args).parent;

        await setupEnv(globalArgs.args, x.requirements, globalArgs.opts());
        await x.handler({
          args: params.filter(p => typeof p === 'string'),
          opts: Object.assign({ registry: registryUrl() }, globalArgs.opts(), command.opts()),
        });
      });
    });
}

async function action(execute, run, input) {
  if (typeof input === 'string') {
    let data = null;
    try {
      data = JSON.parse(input);
    } catch (e) {
      console.error(`The input string is not a valid JSON object: ${input}`);
      return null;
    }

    if (data) return execute(data);
  }

  return run(input);
}

exports.initCli = initCli;
exports.cli = cli;
exports.action = action;
