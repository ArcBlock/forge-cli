## 0.35.0 (August 09, 2019)

- chore: add protocol:list subcommand
- feat: basic transaction protocol activate/deactivate logic

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
