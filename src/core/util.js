const crypto = require('crypto');
const figlet = require('figlet');
const shell = require('shelljs');
const chalk = require('chalk');

function printLogo() {
  shell.echo('');
  shell.echo(chalk.cyan(figlet.textSync('By ArcBlock', { font: 'ANSI Shadow' })));
}

const md5 = data =>
  crypto
    .createHash('md5')
    .update(data)
    .digest('hex');

module.exports = { md5, printLogo };
