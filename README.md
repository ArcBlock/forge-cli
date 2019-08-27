![forge-cli](https://www.arcblock.io/.netlify/functions/badge/?text=Forge%20CLI)

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

`forge-cli` is an awesome toolbox for developers to work with forge, and forge is an awesome framework for building decentralized applications. Out of the box forge-cli support following features:

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

```shell
npm install -g @arcblock/forge-cli
# OR
yarn global add @arcblock/forge-cli
```

Now `forge` command is available to all new shell sessions.

## Usage

Run `forge` and get available options and subcommands.

```terminal
❯ forge

██████╗ ██╗   ██╗     █████╗ ██████╗  ██████╗██████╗ ██╗      ██████╗  ██████╗██╗  ██╗
██╔══██╗╚██╗ ██╔╝    ██╔══██╗██╔══██╗██╔════╝██╔══██╗██║     ██╔═══██╗██╔════╝██║ ██╔╝
██████╔╝ ╚████╔╝     ███████║██████╔╝██║     ██████╔╝██║     ██║   ██║██║     █████╔╝ 
██╔══██╗  ╚██╔╝      ██╔══██║██╔══██╗██║     ██╔══██╗██║     ██║   ██║██║     ██╔═██╗ 
██████╔╝   ██║       ██║  ██║██║  ██║╚██████╗██████╔╝███████╗╚██████╔╝╚██████╗██║  ██╗
╚═════╝    ╚═╝       ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
                                                                                      
Usage: forge [options] [command]

Options:
  -V, --version                                          output the version number
  -v, --verbose                                          Output runtime info when execute subcommand, useful for debug
  -c, --chain-name <chainName>                           Execute command use specific chain
  -f, --config-path <path>                               Forge config used when starting forge node and initializing gRPC clients
  -r, --npmRegistry <registry>                           Specify a custom npm registry
  -y, --yes                                              Assume that the answer to any confirmation question is yes
  -d, --defaults                                         Run command using default values for all questions
  -g, --socket-grpc <endpoint>                           Socket gRPC endpoint to connect, with this you can use forge-cli with a remote node
  -h, --help                                             output usage information

Commands:
  account <address>                                      Get an account info by address
  account:create                                         Interactively create an account, guarded by a passphrase
  account:delete <address>                               Delete an account by address
  account:list [role]                                    List all accounts stored in this node
  asset <address>                                        Get asset info by address
  block [options] [height]                               Get the block info from the running node
  chain:create|create-chain [chainName]                  Create a new chain instance
  chain:ls|chains                                        List all chains
  chain:remove|reset [<chainName>]                       Remove chains
  checkin                                                Send a poke tx to the network to get tokens for test
  config [options] [action]                              Read/write chain/node config
  declare:node                                           Declare the current node to be a validator candidate
  download [options] [version]                           Download a forge release without activate it
  help <subcommand>                                      Show help of a sub command
  install|init [options] [version]                       Download and setup forge release on this machine
  join <endpoint>                                        Join a network by providing a valid forge web graphql endpoint
  logs [type]                                            Show logs for various forge components
  ls                                                     List forge releases installed locally
  project:create|create-project [options] [starterName]  Create a project from forge starter projects
  protocol:activate [name|address]                       Activate a transaction protocol by name or address
  protocol:compile [sourceDir]                           Compile a forge transaction protocol
  protocol:deactivate [name|adderss]                     Deactivate a transaction protocol
  protocol:deploy [itxPath]                              Deploy a compiled transaction protocol to ABT Node
  protocol:ls                                            List transaction protocols
  ps                                                     List running forge component processes
  remote [shellName]                                     Connects to the running system via a remote shell
  simulator [action]                                     Start/stop simulator and generate random traffic
  stake [options] [show]                                 Stake to various entities: node/user/asset
  start [options] [<chainName>]                          Start a chain daemon, if does not specify a chain name, it will start a default chain
  status [type]                                          List info of the running chain/node
  stop [options] [<chainName>]                           Stop the forge daemon and all forge components, if does not specify a chain name, it will start a default chain
  tx [hash]                                              Get a tx detail and display
  tx:list                                                List latest transactions
  tx:send                                                Send a signed tx to the network
  tx:sign                                                Sign a transaction (base64) according to sender’s wallet
  unstake                                                Revert stakes to various entities
  upgrade [<chainName>]                                  Upgrade chain node to new version without reset
  use [version]                                          Activate an already downloaded forge release
  version                                                Output version for all forge components
  wallet:create                                          Create a local wallet and dump its public/private key
  web [options] [action]                                 Start/stop the web interface of running forge chain/node
  workshop [action]                                      Start/stop the dApps workshop

Examples:

  Please install a forge-release before running any other commands
  > forge install latest
  > forge install --mirror http://arcblock.oss-cn-beijing.aliyuncs.com

  Curious about how to use a subcommand?
  > forge help install
  

```

## FAQ

Checkout [FAQ.md](./docs/FAQ.md)
