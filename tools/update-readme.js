/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

const readmeFile = path.join(__dirname, '../README.md');
const { stdout } = shell.exec(path.resolve(__dirname, '../bin/forge'), { silent: true });
const readmeContent = `# forge-cli

> Command line tool to manage local forge chain node
> Last updated at ${new Date().toISOString()}

## Requirements

- Linux/Mac Command Line, iTerm is recommended.
- Node.js: npm/yarn, please install using [nvm](https://github.com/creationix/nvm), v10+

## Install

\`\`\`shell
npm install -g @arcblock/forge-cli
\`\`\`

Now \`forge\` command is available to all new shell sessions.

## Usage

Run \`forge\` and get available options and subcommands.

\`\`\`terminal
❯ forge
${stdout}
\`\`\`

## Contribute

\`\`\`shell
git clone git@github.com:ArcBlock/forge-cli.git
make init
cd packages/forge-cli
ln -s ./bin/forge /usr/local/bin/forge
\`\`\`
`;

fs.writeFileSync(readmeFile, readmeContent);
console.log('README.md updated');
