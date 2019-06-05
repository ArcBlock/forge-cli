# FAQ

## How to start forge with custom config or release directory?

Developer can provide different forge config file path and forge release directory at will.

- forge config file path can be provided with `$FORGE_CONFIG`, or `--config-path`
- forge release dir can be provided with `$FORGE_RELEASE_DIR`, or `--release-dir`

And these 2 options can be combined to meet any developer needs to start forge with different config or release.

Here is my configuration to test latest forge master:

```shell
export FORGE_RELEASE_DIR=$HOME/Develop/arcblock/forge/_build/staging/rel
```

When I test with latest forge release:

```shell
export FORGE_RELEASE_DIR=$HOME/.forge_cli/release
```

When I need to start forge with simple custom config:

```shell
export FORGE_CONFIG=/PATH_TO/examples/simple/forge.toml
```

When I need to start forge with nodejs kvstore example config:

```shell
export FORGE_CONFIG=/PATH_TO/examples/kvstore/config/forge.toml
```
