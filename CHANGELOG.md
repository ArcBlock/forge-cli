## 1.3.0 (June 19, 2020)

- chore: bump forge sdk version

## 1.2.2 (April 22, 2020)

- chore: only consume starter blocklets from forge-cli
- chore: bump forge sdk

## 1.2.1 (March 26, 2020)

- use npm package's shasum to check
- fix forge web router bug
- add public network list

## 1.2.0 (March 26, 2020)

- chore: cleanup transaction protocol related code

## 1.1.3 (March 25, 2020)

- 添加跳过 npm 包校验命令行参数: `--no-verify`
- 设置 blocklet registry 为配置项

## 1.1.2 (March 21, 2020)

- modify descriptions after chain started

## 1.0.1 (March 20, 2020)

- retire dapp workshop
- retire forge swap
- bump version

## 1.1.0 (March 18, 2020)

- [one-webapp] serve static webapp via pm2 && serve-static

## 1.0.15 (March 09, 2020)

- fix blocklet:use bug

## 1.0.14 (March 04, 2020)

- add npm package integrity verification when run blocklet:use
- modify blocklet:use prompts

## 1.0.13 (February 29, 2020)

- optimizing install blocket dependencies

## 1.0.12 (December 15, 2019)

- chore: bump forge sdk version
- feat: support validator update in silent mode
- feat: support validator declare option
- feat: basic validator update features #354
- feat: support config the restricted declare feature in latest forge web #355

## 1.0.11 (December 04, 2019)

- hotfix: warning un supported OS error

## 1.0.10 (December 04, 2019)

- chore: remove useless app logs
- [unit test] libs.getForgeDistributionByOS
- feat: print more accurate OS distribution when install/download #348

## 1.0.9 (December 03, 2019)

- chore: bump version

## 1.0.8 (November 26, 2019)

- feat: retry download if failed #332

## 1.0.7 (November 26, 2019)

- fix unit test in makefile
- fix import module error
- remove unused empty line
- add test to script hooks
- feat: load remote forge releases when upgrade #334

## 1.0.6 (November 25, 2019)

- fix download patch version forge error

## 1.0.5 (November 25, 2019)

- refact: fetch latest releases
- refact: download module

## 1.0.4 (November 22, 2019)

- chore: modify 'forge web' to 'Forge Web'
- feat: adapt to latest forge swap configuration #341
- fix: compile contract error #342

## 1.0.3 (November 21, 2019)

- feat: print common tools version info if there was no chain name specified #333

## 1.0.2 (November 15, 2019)

- fix: CLI upgrade description typo

## 1.0.1 (November 13, 2019)

- chore: update cli doc links

## 1.0.0 (November 12, 2019)

- bump Forge CLI version to 1.0.0
- feat: upgrade forge js sdk to 1.0.0
- chore: not support strict upgrade rule temporarily
- chore: update forge quick start video in README
- chore: remove unnecessary code about chain from use command
- fix: forge releases sort bug when upgrade
- chore: rename prepare to deploy:prepare #300

## 0.40.7 (November 10, 2019)

- remove checkin function from create chain
- adapt latest workshop config

## 0.40.6 (November 09, 2019)

- fix: download prerelease version forge assets bug

## 0.40.5 (November 07, 2019)

- feat: use update-notifier package to check update
- chore: remove postinstall script && set min block time to 3s
- chore: remove moderator setting when config chain
- chore: remove ipfs code
- chore: modify moderator sk outputs when creat chain
- feat: modify the flow of using cli for the first time
- chore: modify typo in forge web and forge chain:config

## 0.40.4 (November 06, 2019)

- integrate atomic service

## 0.40.3 (November 04, 2019)

- chore: check if forge process exists before start web when run `forge start`
- improvement: validate ugprade tx during upgrade

## 0.40.2 (November 02, 2019)

- fix: create chain failed

## 0.40.1 (November 01, 2019)

- feat: modify the method of naming moniker
- improvement: forge version ui and upgrade limitation

## 0.40.0 (October 31, 2019)

- chore: remove create:cli code
- feat: upgrade js-sdk and deprecate commands

## 0.39.28 (October 31, 2019)

- fix: remove `app` from forge config

## 0.39.27 (October 30, 2019)

- breaking change: change account/blocklet/chain/contract/install/tx subcommands #300
- chore: remove non-root doc if run with root user #279
- feat: ignore fetch remote releases error when list local releases #299
- chore: bunch of updates
- refact: remove useless deps

## 0.39.26 (October 30, 2019)

- fix: cache failed

## 0.39.25 (October 29, 2019)

- feat: add contract:create command #164
- refact: rename protocol:ls to contract:ls
- refact: rename protocol:deploy to contract:deploy
- refact: rename protocol:deactivate to contract:deactivate
- refact: rename protocol:compile to contract:compile
- refact: rename protocol:activate to contract:activate

## 0.39.24 (October 28, 2019)

- refactor: rename config to chain:config
- feature: add forge config command #213
- chore: modify mechanism of check for latest

## 0.39.23 (October 25, 2019)

- fix: bug with multi user at same host #284

## 0.39.22 (October 25, 2019)

- fix: moderator is required by forge #291
- refact: move default icon to constant

## 0.39.21 (October 24, 2019)

- improvement: chain name is no longer required by forge version #290

## 0.39.20 (October 24, 2019)

- fix: fetch public IPv4 failed during forge prepare #305

## 0.39.19 (October 23, 2019)

- fix: CLI still fetch remote assets while `releaseDir` was set #302
- fix: `host` is require by latest workshop config #304

## 0.39.18 (October 23, 2019)

- validate if the chain config folder is complete #282

## 0.39.17 (October 22, 2019)

- add `cwd` param when reading ~/.forgerc.yml, to ensure read from current user's space #293;
- remove releases, rpc and chainName requirements from `forge ps` command.

## 0.39.16 (October 22, 2019)

- fix: start workshop failed with latest version #296

## 0.39.15 (October 18, 2019)

- chore: bump forge sdk version

## 0.39.14 (October 15, 2019)

- blocklet:init: add -d/-y args support
- feat: add blocklet:init command

## 0.39.13 (October 12, 2019)

- chore: update typo
- chore: make output more friendly if the protocol has been deployed
- fix: forge chain:ls not list all protocols
- fix moderator validation error #263
- chore: check FORGE_CONFIG is valid
- refact: unified reading of moderator

## 0.39.12 (October 12, 2019)

- fix: add SHELL and HOME variable when start forge\*\_release #280

## 0.39.11 (October 11, 2019)

- Merge branch 'master' into chore/updates
- chore: use official aliyun oss
- chore: update download help
- chore: support `releaseDir` in global config
- chore: bump forge sdk version

## 0.39.10 (October 11, 2019)

- fix chain:ls and ls command's chain name requirement error

## 0.39.9 (October 11, 2019)

- fix subcomamnds chain requirements errors #270

## 0.39.8 (October 10, 2019)

- rename `--npmRegistry` to `--npm-registry`.
- change default grpc code starts from `28210` to `28300`

## 0.39.7 (October 10, 2019)

- fix: allow mutiple chain judgement error when create chain

## 0.39.6 (October 10, 2019)

- fix: stop a not existed web should exit normally
- feat: make `--config-path` work again #172
- refact: read forge relative path from forge config file(forge_release.toml)

## 0.39.5 (October 08, 2019)

- feat: support `defaults` global config #264

## 0.39.4 (October 05, 2019)

- chore: polish auto suggestion
- feat: support subcommand typo suggestion like git #261

## 0.39.3 (October 04, 2019)

- chore: use moderator sk from global yaml config
- chore: cleanup duplicate getModerator in env.js

## 0.39.2 (October 03, 2019)

- chore: polish prettyjson
- chore: use prettyjson
- chore: remove tx methods

## 0.39.1 (September 30, 2019)

- chore: bump sdk version

## 0.39.0 (September 27, 2019)

- feature: no longer create a default chain before execute every command #245
- fix: chain:create bug

## 0.38.28 (September 26, 2019)

- fix search tendermint process bug #250

## 0.38.27 (September 26, 2019)

- fix: error process exit code during start chain

## 0.38.26 (September 26, 2019)

- chore: bump forge sdk version

## 0.38.25 (September 25, 2019)

- chore: prompt user to install when no release found #247
- fix: forge install didn't work with ansible(script) #243

## 0.38.24 (September 25, 2019)

- hotfix: getLocalVersions function call error

## 0.38.23 (September 24, 2019)

- fix: 'forge ls/upgrade/ls:remote' list incomplete releases #239
- chore: remove details of specific version from `forge list` outputs
- refact: `listReleases` and `getLocalVersions` function
- refact: move `getPlatform` to util module

## 0.38.22 (September 24, 2019)

- chore: bump version
- chore: support adding new peer to current node
- chore: initial working version of production config generating
- chore: add prepare command
- fix: typo

## 0.38.21 (September 24, 2019)

- fix: error chain_id when first run forge config set #232

## 0.38.20 (September 22, 2019)

- chore: use asset list from remote

## 0.38.19 (September 21, 2019)

- fix: not version after upgrade success

## 0.38.18 (September 21, 2019)

- fix: get moderator during forge upgrade

## 0.38.17 (September 20, 2019)

- fix: forge upgrade is broken

## 0.38.16 (September 19, 2019)

- feature: add token validations when custom forge configs #219

## 0.38.15 (September 19, 2019)

- feat: include moderator in the config file for default chain
- fix: do not panic when current forge-release not set
- fit to forge configs of greater than v0.38.0

## 0.38.14 (September 19, 2019)

- improvement: use url.resolve instead of concat strings to concat url
- fix unintended exit before download successfully #226
- improvement: throw error if download incomplete

## 0.38.13 (September 16, 2019)

- chore: move mirror param to global
- fix: global mirror settings not used when download and install

## 0.38.12 (September 12, 2019)

- blocklet: load blocklet from npm
- blocklet: load local blocklet

## 0.38.11 (September 12, 2019)

- chore: download forge-swap

## 0.38.10 (September 11, 2019)

- fix: Print duplicate chain name

## 0.38.9 (September 11, 2019)

- fix not exit process when upgrade failed #214

## 0.38.8 (September 05, 2019)

- fix the inconsistency between chain:ls and ps #193
- fix: chain:ls version undefined bug #192
- chore: disable ls, ls:remote show chain name

## 0.38.7 (September 04, 2019)

- feature: add cli logs #135

## 0.38.6 (September 04, 2019)

- feature: add forge ls:remote command #120
- chore: update dep and change newline in bump-version

## 0.38.5 (September 02, 2019)

- fix: failed to read exit_status if start failed

## 0.38.4 (August 30, 2019)

- chore: update start output
- fix: download should not change current local forge version #191
- fix: upgrade output in multi chain mode

## 0.38.3 (August 30, 2019)

- fix: `forge ls` bug when forge package is missing

## 0.38.2 (August 29, 2019)

- feature: use forge-start to start forge when cli with `single chain` mode #170

## 0.38.1 (August 28, 2019)

- feature: optimize way to judge forge-\* downloaded #185
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
