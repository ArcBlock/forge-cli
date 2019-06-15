# forge-cli

> Command line tool to manage local forge chain node
> Last updated at 2019-06-15T01:22:39.908Z

## Requirements

- Linux/Mac Command Line, iTerm is recommended.
- Node.js: npm/yarn, please install using [nvm](https://github.com/creationix/nvm), v10+

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
  -r, --release-dir                     Forge release directory path (unzipped), use your own copy forge release
  -c, --config-path                     Forge config used when starting forge node and initializing gRPC clients
  -g, --socket-grpc                     Socket gRPC endpoint to connect, with this you can use forge-cli with a remote node
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
  init [options] [version]              Download and setup forge release on this machine
  join <endpoint>                       Join a network by providing an forge web graphql endpoint to fetch config
  logs|log [type]                       Show logs for various forge components
  ps                                    List application status for forge (includes tendermint and ipfs)
  reset [options]                       Reset current chain state, run with caution
  restart [app]                         Restart the forge managed applications: core/app/tendermint/ipfs
  simulate|simulator [action]           Start/stop simulator and generate some random data
  start [options]                       Start forge as a daemon in the background
  state|status [type]                   List the information of the chain and the node, chain|core|net|validator|web
  stop                                  Stop the forge daemon (forge-core, forge-app, consensus engine, storage engine)
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

  Be sure to initialize before running any other commands
  > forge init

  Curious about how to use a subcommand?
  > forge help init
  

```

## Contribute

```shell
git clone git@github.com:ArcBlock/forge-cli.git
make init
cd packages/forge-cli
ln -s ./bin/forge /usr/local/bin/forge
```
