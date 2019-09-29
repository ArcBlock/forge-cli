/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
const tabtab = require('tabtab');

const completion = (program, env) => {
  if (!env.complete) {
    return false;
  }

  if (env.prev === 'someCommand') {
    return tabtab.log(['is', 'this', 'the', 'real', 'life']);
  }

  if (env.prev === 'anotherOne') {
    return tabtab.log(['is', 'this', 'just', 'fantasy']);
  }

  if (env.prev === '--loglevel') {
    return tabtab.log(['error', 'warn', 'info', 'notice', 'verbose']);
  }

  // long options
  if (/^--\w?/.test(env.last)) {
    return tabtab.log(program.options.map(x => ({ name: x.long })));
  }

  // short options
  if (/^-\w?/.test(env.last)) {
    return tabtab.log(program.options.map(x => ({ name: x.short })));
  }

  // commands
  return tabtab.log(program.commands.map(x => ({ name: x._name, description: x._description })));
};

exports.init = async (program, appName) => {
  const cmd = process.argv.slice(2)[0];

  if (cmd === 'install-completion') {
    // Here we install for the program `tabtab-test` (this file), with
    // completer being the same program. Sometimes, you want to complete
    // another program that's where the `completer` option might come handy.
    await tabtab
      .install({
        name: appName,
        completer: appName,
      })
      .catch(err => console.error('INSTALL ERROR', err));

    return;
  }

  if (cmd === 'uninstall-completion') {
    // Here we uninstall for the program `tabtab-test` (this file).
    await tabtab
      .uninstall({
        name: appName,
      })
      .catch(err => console.error('UNINSTALL ERROR', err));

    return;
  }

  if (cmd === 'completion') {
    const env = tabtab.parseEnv(process.env);
    completion(program, env);
  }
};
