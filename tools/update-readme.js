/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

const readmeFile = path.join(__dirname, '../README.md');
const { stdout } = shell.exec(path.resolve(__dirname, '../bin/forge'), { silent: true });
const readmeContent = `<h1 align="center">@arcblock/forge-cli</h1> <br>
<p align="center">
  <a href="https://www.arcblock.io/">
    <img alt="ArcBlock" title="ArcBlock" src="https://raw.github.com/ArcBlock/forge-cli/master/docs/logo.png" width="234">
  </a>
</p>

<p align="center">
  Command line toolbox that helps developers to work with <a href="https://docs.arcblock.io/forge/latest/">ArcBlock Forge SDK</a>
</p>

## Table of Contents

- [Introduction](#introduction)
- [QuickStart](#quickstart)
- [Requirements](#requirements)
- [Install](#install)
- [Usage](#usage)
- [FAQ](#faq)

## Introduction

[![](https://img.shields.io/npm/v/@arcblock/forge-cli.svg?label=forge-cli)](https://www.npmjs.com/package/@arcblock/forge-cli)
[![docs](https://img.shields.io/badge/powered%20by-arcblock-green.svg)](https://docs.arcblock.io/forge/latest/tools/forge_cli.html)
[![Build Status](https://img.shields.io/travis/arcblock/forge-cli.svg?style=flat-square)](https://travis-ci.com/arcblock/forge-cli)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

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

[![asciicast](https://asciinema.org/a/253439.svg)](https://asciinema.org/a/253439){target="_blank"}

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

## FAQ

Checkout [FAQ.md](./docs/FAQ.md)
`;

fs.writeFileSync(readmeFile, readmeContent);
console.log('README.md updated');
