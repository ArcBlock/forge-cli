const inquirer = require('inquirer');
const debug = require('core/debug')('interaction');

async function inquire(questions = [], { defaults = false, yes = false, silent = false } = {}) {
  const q = Array.isArray(questions) ? questions : [questions];
  if (defaults || yes || silent) {
    debug('exec in inactive mode', { defaults, yes, silent });

    const defaultAnswers = q.reduce((acc, cur) => {
      if (typeof cur.default !== 'undefined') {
        acc[cur.name] = cur.default;
      }

      return acc;
    }, {});

    return defaultAnswers;
  }

  return inquirer.prompt(q);
}

module.exports = { inquire };
