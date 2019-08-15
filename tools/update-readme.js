/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

const readmeFile = path.join(__dirname, '../README.md');
const { code, stdout, stderr } = shell.exec(path.resolve(__dirname, '../bin/forge'), {
  silent: true,
});

if (code > 0) {
  console.error(`get forge help error ${code}:`);
  console.error(stderr);
  process.exit(code);
}

const readmeContent = `![forge-cli](https://www.arcblock.io/.netlify/functions/badge/?text=Forge%20CLI)

> Command line toolbox maintained by [Arcblock](https://www.arcblock.io) that helps developers to work with [Forge SDK](https://docs.arcblock.io/forge/latest/)

## Table of Contents

- [Introduction](#introduction)
- [QuickStart](#quickstart)
- [Requirements](#requirements)
- [Install](#install)
- [Usage](#usage)
- [FAQ](#faq)

## Introduction

[![](https://img.shields.io/npm/v/@arcblock/forge-cli.svg?label=forge-cli&style=flat-square)](https://www.npmjs.com/package/@arcblock/forge-cli)
[![docs](https://img.shields.io/badge/powered%20by-arcblock-green.svg?style=flat-square)](https://docs.arcblock.io/forge/latest/tools/forge_cli.html)
[![Build Status](https://img.shields.io/travis/com/arcblock/forge-cli?style=flat-square)](https://travis-ci.com/arcblock/forge-cli)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Gitter](https://img.shields.io/gitter/room/ArcBlock/community?style=flat-square&color=%234cb696)](https://gitter.im/ArcBlock/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

\`forge-cli\` is an awesome toolbox for developers to work with forge, and forge is an awesome framework for building decentralized applications. Out of the box forge-cli support following features:

- Manage forge kernel release
- Manage local forge node, join a remote forge powered network
- Create wallets and accounts on blockchain
- Read/subscribe accounts/blocks/transactions/assets on blockchain
- Send transactions to the blockchain
- Use forge components such as forge-web and dapps-workshop
- Compile and deploy transaction protocol
- Do stake to node/user/asset
- Bootstrap dApps with starters from [here](https://github.com/ArcBlock/forge-dapp-starters)

## Requirements

- Linux/Mac Command Line, **windows is not support currently**, [iTerm](http://www.iterm2.com/) is recommended.
- [Node.js](https://nodejs.org/): please install using [nvm](https://github.com/creationix/nvm), v8+

## QuickStart

[![asciicast](https://asciinema.org/a/253439.svg)](https://asciinema.org/a/253439)

## Install

\`\`\`shell
npm install -g @arcblock/forge-cli
# OR
yarn global add @arcblock/forge-cli
\`\`\`

Now \`forge\` command is available to all new shell sessions.

## Usage

Run \`forge\` and get available options and subcommands.

\`\`\`terminal
❯ forge
${stdout}
\`\`\`

## FAQ

Checkout [FAQ.md](./docs/FAQ.md)
`;

fs.writeFileSync(readmeFile, readmeContent);
console.log('README.md updated');
