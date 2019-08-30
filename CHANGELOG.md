## 0.38.3 (August 30, 2019)

- fix: `forge ls` bug when forge package is missing

## 0.38.2 (August 29, 2019)

- feature: use forge-start to start forge when cli with `single chain` mode #170

## 0.38.1 (August 28, 2019)

- feature: optimize way to judge forge-* downloaded #185
- refactor: replace curl with axios when download assets

## 0.38.0 (August 27, 2019)

- chore: chore: rename registry to npmRegistry

## 0.37.10 (August 27, 2019)

- chore: respect autoUpgrade from global config
- chore: reorganize files
- feat: basic support of using local release dir #182
- chore：remove `--release-dir` as command line arguments
- fix: forge account xxx is broken

## 0.37.9 (August 25, 2019)

- fix: each chain uses its own version configuration, the `version` is stored in `<chain config directory>/config.yml` #171
- feature: add `~/.forgerc.yml` config to store forge cli config, current includes:
  - registry: npm registry, `registry` in `~/.npmrc` has higher priority than `~/.forgerc.yml`
  - allowMultiChain: boolean
- refactor: rename _profile_ to _config_, for consistency

## 0.37.8 (August 23, 2019)

- remove terminal image package

## 0.37.7 (August 23, 2019)

- feature: auto upgrade forge-cli if user confirm to upgrade #163

## 0.37.6 (August 23, 2019)

- fix: should also restart forge web after upgrade forge core #160

## 0.37.5 (August 22, 2019)

- add endpoints column in forge ps output #168

## 0.37.4 (August 22, 2019)

- fix: shell.exec will return null if no output

## 0.37.3 (August 21, 2019)

- chore: add waiting effect during create project during fetching starters information from remote server. #165
- add warning when remove the 'default' chain #152
- feature: option to automatically create account during chain setup #134
- chore: hidden current chain name when run 'forge chain:remove' #151

## 0.37.2 (August 21, 2019)

- chore: show version in `forge protocol:ls`

## 0.37.1 (August 20, 2019)

- fix: wallet requirements functions error

## 0.37.0 (August 20, 2019)

- project:create, check is starter exists
- project:create, support load from local
- project:create, download starter from npm
- refactor: make create project read some config from package.json
- refactor: capsulate copy file code to a function

## 0.36.8 (August 16, 2019)

- fix: forge config set will cause poke not working #156

## 0.36.7 (August 15, 2019)

- chore: tune protocol related sub commands
- support `forge protocol:activate` subcommand
- support `forge protocol:deactivate` subcommand
- support `forge protocol:list` subcommand

## 0.36.6 (August 14, 2019)

- chore: update badges in readme

## 0.36.5 (August 14, 2019)

- fix publish script bug

## -0.36.4 (August 13, 2019)

- feature: add `chain:ls` command to show all chains #133
- chore: rename `reset` to `chain:remove` #133
- refact: rename appName to chainName, and move getAllAppNames function from forge-fs to forge-process

## 0.36.3 (August 13, 2019)

- change the logic after forge installation #137
- chore: modify prompt message

## 0.36.2 (August 12, 2019)

- fix: forge upgrade tx not display correctly #107
- upgrade forge-js dependencies #139

## 0.36.1 (August 12, 2019)

- chore: create symbolic links correctly when copy files #140

## 0.36.0 (August 01, 2019)

- add multi chain feature, mainly includes:
  - create a new chain by `forge create-chain <chainName>`
  - enable start/stop/reset the specific chain by `forge <action> <chainName>| [--chain-chain <chainName>] | [-c <chainName>]`
  - `forge ps` will show all chains running processes
- remove `-m` param in `start` command
- refactor file management
- refactor process management
- deprecated use `forge-starter` to start the chain
- deprecated the `--force | -f` param of `forge stop` command, and add `--all | -a` to stop all chains
- modify `--config-path | -c` to `--config-path | -f`

## 0.34.6 (August 08, 2019)

- chore: bump version
- fix: changelog generating error because no github release tag

## 0.34.5 (July 30, 2019)

- fix: remove target blank in readme that github cannot recognize

## 0.34.4 (July 30, 2019)

- feat: support join without safety prompt
- fix: forge join failure with some missing config #119

## 0.34.3 (July 30, 2019)

- support silent mode when install forge #118

## 0.34.2 (July 25, 2019)

- chore: wording improvement (#113)
- chore: forge start improvement (#114)

## 0.34.1 (July 25, 2019)

- Output more details if forge exited by [exit logs](https://github.com/ArcBlock/forge/pull/888)

## 0.34.0 (July 22, 2019)

- chore: update forge sdk version
- fix: FORGE_SOCK_GRPC and FORGE_CONFIG should both be respected

## 0.33.17 (July 19, 2019)

- chore: make large numbers readable
- fix: forge config set default decimal should be 18 #110
- fix: default poke.daily_limit should be 10000

## 0.33.16 (July 18, 2019)

- fix: endpoint choosing login when create grpc client

## 0.33.15 (July 17, 2019)

- chore: make encoding options default when create wallet
- fix: validate token holder pk before write config
- fix: improve default poke config because workshop will exceed daily limit

## 0.33.14 (July 17, 2019)

- fix: block streaming not working #71

## 0.33.13 (July 16, 2019)

- fix: should ask user to input token holder info when no moderator set

## 0.33.12 (July 16, 2019)

- feature: exit all processes if start failed #97

## 0.33.11 (July 16, 2019)

- fix start web error display, extend graphql check timeout

## 0.33.10 (July 16, 2019)

- add graphql check after start web process #77
- add simulator/forge-web/workshop stats into 'forge ps' command #77

## 0.33.9 (July 16, 2019)

- fix: wallet info encoding format default value

## 0.33.8 (July 15, 2019)

- feat: support output pk/sk in multiple formats when create wallet

## 0.33.7 (July 15, 2019)

- feat: support customize token holder address and pk

## 0.33.6 (July 15, 2019)

- chore: trigger cnpm sync on publish

## 0.33.5 (July 13, 2019)

- feat: support different encoding formats for wallet keys #95

## 0.33.4 (July 12, 2019)

- fix: forge config has some critical comments that should be reserved

## 0.33.3 (July 12, 2019)

- fix: poke config not correct
- fix: forge stop should abort when forge is not started
- feat: remove config in `forge reset`

## 0.33.2 (July 12, 2019)

- feat: support generate `forge.accounts` in `forge config set` command
- fix: `forge config` using wrong default of `forge.poke.daily_limit`
- fix: incorrect forge started checking before switch forge version
- fix: add version match check before join a network #84

## 0.33.1 (July 11, 2019)

- upgrade lodash to latest version to fix lodash prototype pollution #91

## 0.33.0 (July 11, 2019)

- chore: add gitter badge
- chore: update download complete tip
- fix: `forge stop` requirements
- chore: remove redundant command aliases
- chore: polish command description
- fix: sort commands by alphabetic in the list #83

## 0.32.5 (July 09, 2019)

- feat: support config forge chain/node from forge-cli #86
- fix: `forge --version` is broken
- feat: support creating wallets in forge-cli without a running node #4
- chore: update readme
- chore: update update readme script
- chore: update `forge stop` description

## 0.32.4 (July 08, 2019)

- feat: display account type info when do `forge account xxx` #74
- chore: update forge-sdk dependency to latest
- fix: account detail wallet env detecting
- fix: forge -h and forge --help prints different contents #50
- fix: stop all forge tools when do forge stop #52
- feat: list version for all tools in forge-cli #29
- fix: change text logo color from red to cyan #70
- feat: support aggresive mode forge-stop #56
- fix: forge status web is not supported anymore #62
- fix: forge status web is not supported anymore #62
- chore: add install instructions for china users
- fix: forge init displays NAN for some asset size #43
- fix: show custom config in yellow text when found #55
- fix: show custom forge config in yellow text when found #55
- fix: only show custom mirror in yellow text when its set #46
- fix: rename forge init to forge install and use init as alias #45

## 0.32.3 (July 05, 2019)

- fix: forge version requirement tip

## 0.32.2 (July 03, 2019)

- feat: support forge upgrade command
- chore: refactor protocol deploy command for upgrade command
- chore: add one possible solution to start failure
- chore: cleanup useless dependency and upgrade forge-sdk
- fix: inconsistency pid detecting logic on `forge init` and `forge stop` #36

## 0.32.1 (July 01, 2019)

- chore: update simulator related commands
- fix: forge workshop start command
- fix: forge web start command

## 0.32.0 (June 29, 2019)

- fix: elixir binary pid subcommand issue #32
- fix: forge start command change to daemon #32
- chore: update elixir binary start command #32
- chore: use centos release for all linux distributions #33

## 0.31.3 (June 25, 2019)

- fix: forge start wait too long
- chore: add keywords in package.json

## 0.31.2 (June 25, 2019)

- chore: polish readme
- chore: update faq docs

## 0.31.1 (June 24, 2019)

- chore: bump version

## 0.31.0 (June 24, 2019)

- chore: add timeout for `forge start` and print error message on timeout #25
- chore: prompt user not to start forge as root #23
- chore: update unsupported platform warning

## 0.30.9 (June 24, 2019)

- add availability check on latest LTS version of Node.js

## 0.30.8 (June 21, 2019)

- feat: allow user to specify platform and
- fix: use centos release for all linux
- chore: bump version

## 0.30.7 (June 18, 2019)

- remove CONTRIBUTE from readme

## 0.30.6 (June 17, 2019)

## 0.30.5 (June 17, 2019)

## 0.30.4 (June 15, 2019)

## 0.30.3 (June 15, 2019)

- fix: install error when env without yarn

## 0.30.2 (June 15, 2019)

- fix: disable ipfs for logs

## 0.30.1 (June 14, 2019)

## 0.30.0 (June 13, 2019)

- chore: update forge js sdk version
- chore: can download/start/stop/open forge workshop
- chore: remove ci test for Node.js v11

## 0.29.1 (June 10, 2019)

- fix: forge create-project use more strict blacklist checking
- chore: update dependency
- chore: bump version

## 0.29.0 (June 08, 2019)

- chore: update forge-sdk to v0.29.0
- chore: ensure forge_web is started/stopped on forge daemon start/stop
- chore: improve forge-cli start and project create command (#15)

## 0.28.11 (June 05, 2019)

- fix: forge create-project not respecting blacklist setting
- chore: support listing starter packages from both npm and yarn global packages/links
- chore: support start multiple chain
- chore: update welcome commands
- chore: bump version

## 0.28.10 (June 05, 2019)

## 0.28.9 (June 05, 2019)

- fix: npm publish issue on travis

## 0.28.5 (June 05, 2019)

Checkout [Forge SDK CHANGELOG](https://github.com/ArcBlock/forge-js/blob/master/CHANGELOG.md) for older releases.
