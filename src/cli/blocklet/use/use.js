const fs = require('fs');
const path = require('path');

const BLOCKLET_CONFIG_FILENAME = 'blocklet.json';
const BLOCKLET_GROUPS = ['starter', 'dapp', 'contract'];

const fetchRemoteBlocklet = async name => {
  // 0: read from cache
  // 1. fetch from remote
  console.log(name);
};

/**
 * Load handler by blocklet group name
 * @param {string} group - blocklet group name
 */
const loadHandlerByBlockletGroup = group => {
  const filePath = path.join(__dirname, '..', 'lib', `${group}.js`);
  if (!group || !fs.existsSync(filePath)) {
    throw new Error(`group ${group} is invalid`);
  }

  return require(filePath); // eslint-disable-line
};

/**
 * Get blocklet information
 *
 * @param {Object} options
 * @param {string} options.name - blocklet name, if localBlockDir is empty, it will use `name` to fetch blocklet from remote
 * @param {string} options.localBlockletDir - If localblockDir is not empty, will load from local blocklet
 * @returns {Object} info - blocklet information
 * @returns {Object} info.blockletDir - blocklet directory
 */
async function loadBlocklet({ name = '', localBlockletDir }) {
  let blockletDir = '';

  if (localBlockletDir) {
    blockletDir = path.resolve(localBlockletDir);
  } else {
    // download from remote
    blockletDir = await fetchRemoteBlocklet(name);
  }

  if (!fs.existsSync(blockletDir)) {
    throw new Error('load blocklet failed');
  }

  return blockletDir;
}

const verifyBlocklet = blockletDir => {
  const blockletJSONPath = path.join(blockletDir, BLOCKLET_CONFIG_FILENAME);

  if (!fs.existsSync(blockletJSONPath)) {
    throw new Error(`${BLOCKLET_CONFIG_FILENAME} file not found`);
  }

  const blockletConfig = JSON.parse(fs.readFileSync(blockletJSONPath));

  if (!BLOCKLET_GROUPS.includes(blockletConfig.group)) {
    throw new Error('invalid group');
  }

  // TODO: verify other requirements
};

// Execute the cli silently.
function execute(data) {
  run(data);
}

// Run the cli interactively
async function run({ args: [blockletName = ''], opts: { localBlocklet } }) {
  // 0: load blocklet
  const blockletDir = await loadBlocklet({ name: blockletName, localBlockletDir: localBlocklet });

  // 1. verify blocklet

  verifyBlocklet(blockletDir);

  // 2. get blocklet description file
  const blockletConfig = JSON.parse(
    fs.readFileSync(path.join(blockletDir, BLOCKLET_CONFIG_FILENAME)).toString()
  );

  // 3. decide use what type of handlers depend on blocklet type
  const handler = loadHandlerByBlockletGroup(blockletConfig.group);

  // 4. use handlers to execute hooks defined in blocklet description file
  await handler.verify(blockletConfig, { cwd: blockletDir });
  await handler.run(blockletConfig, { cwd: blockletDir });

  return 0;
}

exports.run = run;
exports.execute = execute;
