const path = require('path');
const os = require('os');

const CLI_BASE_DIRECTORY = path.join(os.homedir(), '.forge_cli');
const BLOCKLET_DIR = path.join(os.homedir(), '.blocklets');

module.exports = {
  BLOCKLET_DIR,
  CONFIG_FILE_NAME: '.forge_chains',
  CHAIN_DATA_PATH_NAME: 'forge_release',
  CLI_BASE_DIRECTORY,
  UPDATE_CHECK_INTERVAL: 1000 * 60 * 60 * 24, // one day
  DEFAULT_CHAIN_NAME: 'default',
  DEFAULT_CHAIN_NAME_RETURN: { NO_CHAINS: 1, NO_RUNNING_CHAINS: 2 },
  DEFAULT_FORGE_WEB_PORT: 8210,
  DEFAULT_WORKSHOP_PORT: 8807,
  DEFAULT_FORGE_GRPC_PORT: 28210,
  DEFAULT_MIRROR: 'https://releases.arcblock.io',
  DOCUMENT_URL: 'https://docs.arcblock.io/forge/latest/core/configuration.html',
  REMOTE_BLOCKLET_URL: 'https://releases.arcblockio.cn/blocklets.json',
  RELEASE_ASSETS: [
    'forge',
    'simulator',
    'forge_web',
    'forge_starter',
    'forge_workshop',
    'forge_swap',
  ],
  SHIFT_WIDTH: ' '.repeat(4),
  MIRRORS: [
    'https://releases.arcblock.io',
    'https://arcblock.oss-cn-beijing.aliyuncs.com',
    'https://releases.arcblockio.cn',
  ],
  ASSETS_PATH: {
    LATEST_VERSION: 'forge/latest.json',
    VERSIONS: 'forge/versions.json',
  },
  REQUIRED_DIRS: {
    tmp: path.join(CLI_BASE_DIRECTORY, 'tmp'),
    bin: path.join(CLI_BASE_DIRECTORY, 'bin'),
    cache: path.join(CLI_BASE_DIRECTORY, 'cache'),
    logs: path.join(CLI_BASE_DIRECTORY, 'logs'),
    release: path.join(CLI_BASE_DIRECTORY, 'release'),
  },
  // semver regex from: https://github.com/semver/semver/issues/232#issue-48635632
  SEMVER_REGEX: /forge_swap\/((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(\+[0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*)?)/, // eslint-disable-line
  RESERVED_CHAIN_NAMES: ['forge'],
  BLOCKLET_GROUPS: ['dApp', 'starter', 'contract'],
  BLOCKLET_COLORS: ['primary', 'secondary', 'error'],
  DEFAULT_ICON_BASE64:
    'data:image/png;base64,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',
};
