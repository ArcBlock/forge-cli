const path = require('path');
const os = require('os');

const CLI_BASE_DIRECTORY = path.join(os.homedir(), '.forge_cli');
const BLOCKLET_DIR = path.join(os.homedir(), '.blocklets');

module.exports = {
  BLOCKLET_DIR,
  CONFIG_FILE_NAME: '.forge_chains',
  CHAIN_DATA_PATH_NAME: 'forge_release',
  CLI_BASE_DIRECTORY,
  DEFAULT_CHAIN_NAME: 'default',
  DEFAULT_FORGE_WEB_PORT: 8210,
  DEFAULT_WORKSHOP_PORT: 8807,
  DEFAULT_FORGE_GRPC_PORT: 28210,
  DEFAULT_MIRROR: 'https://releases.arcblock.io',
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
  RESERVED_CHAIN_NAMES: ['forge'],
  BLOCKLET_GROUPS: ['dApp', 'starter', 'contract'],
  BLOCKLET_COLORS: ['primary', 'secondary', 'error'],
};
