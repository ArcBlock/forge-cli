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

[![](https://img.shields.io/npm/v/@arcblock/forge-cli.svg?label=forge-cli)](https://www.npmjs.com/package/@arcblock/forge-cli)
[![docs](https://img.shields.io/badge/powered%20by-arcblock-green.svg)](https://docs.arcblock.io/forge/latest/tools/forge_cli.html)
[![Build Status](https://img.shields.io/travis/arcblock/forge-cli.svg?style=flat-square)](https://travis-ci.com/arcblock/forge-cli)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

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

[![asciicast](https://asciinema.org/a/253439.svg)](https://asciinema.org/a/253439){target="_blank"}

## Install

```shell
npm install -g @arcblock/forge-cli
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
  -v, --verbose                         Output runtime logs when execute the command, used for debug
  -r, --release-dir <dir>               Forge release directory path (unzipped), use your own copy forge release
  -c, --config-path <path>              Forge config used when starting forge node and initializing gRPC clients
  -g, --socket-grpc <endpoint>          Socket gRPC endpoint to connect, with this you can use forge-cli with a remote node
  -h, --help                            output usage information

Commands:
  account:create                        Interactively create an account, guarded by a passphrase
  account:delete <address>              Delete an account by address
  account <address>                     Get an account info by address
  account:list [role]                   List all accounts stored in this node
  asset <address>                       Get asset info by address
  block [options] [height]              Get the block info from the running node
  help <subcommand>                     Show help of a sub command
  version                               Output version for all components, including forge-cli, forge, storage and consensus engine
  config [options]                      Read and display forge config
  declare:node                          Declare the current node to be a validator candidate
  install|init [options] [version]      Download and setup forge release on this machine
  join <endpoint>                       Join a network by providing a valid forge web graphql endpoint to fetch config
  logs|log [type]                       Show logs for various forge components
  ps                                    List application status for forge (includes tendermint and ipfs)
  reset [options]                       Reset current chain state, run with caution
  simulate|simulator [action]           Start/stop simulator and generate some random data
  start [options]                       Start forge as a daemon in the background
  status|state [type]                   List the information of the chain and the node, chain|core|net|validator|all
  stop [options]                        Stop the forge daemon and all forge components
  upgrade                               Upgrade chain node to new version without reset
  web [options] [action]                Start or stop the web UI of running forge node
  workshop [action]                     Start or stop the did workshop
  create-project [options] [targetDir]  Create a project from forge starter projects
  protocol:compile [sourceDir]          Compile a forge transaction protocol to formats that can be deployed to ABT Node
  protocol:deploy [itxPath]             Deploy a compiled transaction protocol to ABT Node
  download [options] [version]          Download a forge release without activate it
  list|ls                               List forge releases installed locally
  use [version]                         Active an already downloaded forge release
  tx [hash]                             Get a tx detail and display
  tx:list                               List latest transactions
  checkin|poke                          Send a poke tx to the network to get tokens for test
  tx:send                               Send a signed tx to the network
  tx:sign                               Sign a transaction (base64) according to sender’s wallet
  stake [options] [show]                Stake to various entities: node/user/asset
  unstake                               Revert stakes to various entities

Examples:

  Please install a forge-release before running any other commands
  > forge install latest
  > forge install --mirror http://arcblock.oss-cn-beijing.aliyuncs.com

  Curious about how to use a subcommand?
  > forge help install
  

```

## FAQ

Checkout [FAQ.md](./docs/FAQ.md)
