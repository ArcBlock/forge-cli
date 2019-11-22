const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const chalk = require('chalk');
const yaml = require('yaml');
const { getSpinner } = require('core/ui');
const debug = require('core/debug')('compile');
const { isFile, isDirectory } = require('core/forge-fs');
const { logError, print, printInfo, printError, printSuccess } = require('core/util');
const { downloadAsset } = require('../../release/download/lib');

const { DEFAULT_MIRROR, REQUIRED_DIRS } = require('../../../constant');

// eslint-disable-next-line consistent-return
function fetchCompilerVersion(mirror = DEFAULT_MIRROR) {
  const spinner = getSpinner('Fetching forge-compiler release version...');
  spinner.start();

  try {
    const url = `${mirror}/forge-compiler/latest.json`;
    const { code, stdout, stderr } = shell.exec(`curl "${url}"`, { silent: true });
    // debug('fetchReleaseVersion', { code, stdout, stderr, url });
    if (code === 0) {
      const { latest: version } = JSON.parse(stdout.trim()) || {};
      spinner.succeed(`Latest forge compiler version: v${version}`);
      return version;
    }
    spinner.fail(`forge-compiler version fetch error: ${stderr}`);
  } catch (err) {
    spinner.fail(`forge-compiler version fetch error: ${err.message}`);
  }

  process.exit(1);
}

// eslint-disable-next-line consistent-return
function fetchCompilerInfo(version, mirror = DEFAULT_MIRROR) {
  const url = `${mirror}/forge-compiler/${version}/forge-compiler`;
  const spinner = getSpinner('Fetching forge compiler info...');
  spinner.start();

  try {
    const { code, stdout, stderr } = shell.exec(`curl -I --silent "${url}"`, { silent: true });
    debug('fetchAssetInfo', { url, version, code, stdout, stderr });
    if (code === 0 && stdout) {
      const notFound = stdout
        .split('\r\n')
        .find(x => x.indexOf('HTTP/1.1 404') === 0 || x.indexOf('HTTP/2 404') === 0);
      if (notFound) {
        spinner.fail(`forge-compiler binary "${url}" not found`);
        process.exit(1);
      }
      spinner.succeed('forge-compiler info fetch success');
      const header = stdout.split('\r\n').find(x => x.indexOf('Content-Length:') === 0);
      const size = header ? Number(header.split(':').pop().trim()) : 3 * 1024 * 1024; // prettier-ignore
      return { url, size, header, name: 'forge-compiler' };
    }
    spinner.fail(`forge-compiler info error: ${stderr}`);
  } catch (err) {
    spinner.fail(`forge-compiler info error: ${err.message}`);
  }

  process.exit(1);
}

async function ensureForgeCompiler() {
  const { stdout } = shell.which('forge-compiler') || {};
  if (stdout && fs.existsSync(stdout.trim())) {
    debug('using forge-compiler from', stdout.trim());
    return stdout.trim();
  }

  const targetPath = path.join(REQUIRED_DIRS.bin, 'forge-compiler');
  if (isFile(targetPath)) {
    debug('using forge-compiler from', targetPath);
    return targetPath;
  }

  // Download forge-compiler binary
  const version = fetchCompilerVersion();
  const asset = fetchCompilerInfo(version);
  const compilerPath = await downloadAsset(asset);
  debug('download compiler to: ', compilerPath);
  shell.mv(compilerPath, targetPath);
  shell.exec(`chmod a+x ${targetPath}`);
  return targetPath;
}

// eslint-disable-next-line consistent-return
async function ensureJavascriptCompiler() {
  const { stdout: protoc } = shell.which('grpc_tools_node_protoc') || {};
  if (protoc && fs.existsSync(protoc.trim())) {
    debug('using protoc from', protoc.trim());

    const { stdout: pbjs } = shell.which('pbjs') || {};
    if (pbjs && fs.existsSync(pbjs.trim())) {
      debug('using pbjs from', pbjs.trim());
      return true;
    }

    printError(
      `protobufjs not installed, please install with ${chalk.cyan('npm install -g protobufjs')}`
    );
    process.exit(1);
  }

  printError(
    `grpc-tools not installed, please install with ${chalk.cyan('npm install -g grpc-tools')}`
  );
  process.exit(1);
}

async function compileElixir({ targetDir, config, configFile, outputPrefix }) {
  printInfo('Generating elixir language support:');

  const compiler = await ensureForgeCompiler();
  const { name } = config;

  // 0. prepare compile dir
  const targetExDir = path.join(targetDir, name, 'elixir');
  shell.exec(`mkdir -p ${targetExDir}`);

  const { code, stdout, stderr } = shell.exec(`${compiler} ${configFile} ${targetExDir}`, {
    silent: true,
  });
  if (Number(code) === 0) {
    printSuccess(
      `Elixir itx generated: ${targetExDir.replace(outputPrefix, '')}/${name}/${name}.itx.json`
    );
  } else {
    printError(`Elixir generate failed: ${stderr || stdout}`);
  }
  print();
}

async function compileJavascript({ sourceDir, targetDir, config, protoFile, outputPrefix }) {
  await ensureJavascriptCompiler();
  printInfo('Generating JavaScript language support:');

  const { name, type_urls: typeUrls } = config;
  const targetJsDir = path.join(targetDir, name, 'javascript');
  fs.mkdirSync(targetJsDir, { recursive: true });

  const protocResult = shell.exec(
    // eslint-disable-next-line max-len
    `grpc_tools_node_protoc --proto_path=/tmp/forge_compiler_vendors --proto_path=${sourceDir} --js_out=import_style=commonjs,binary:${targetJsDir} --plugin=protoc-gen-grpc=\`which grpc_tools_node_protoc_plugin\` ${protoFile}`
  );

  if (protocResult.code !== 0) {
    throw new Error(protocResult.stderr);
  }

  const protobufJsFile = fs.readdirSync(targetJsDir).find(x => path.extname(x) === '.js');
  const relativeDir = targetJsDir.replace(outputPrefix, '');

  printSuccess(`Protobuf js generated: ${path.join(relativeDir, protobufJsFile)}`);
  shell.exec(
    `pbjs -p /tmp/forge_compiler_vendors -p ${sourceDir} -t json -o ${targetJsDir}/protocol_spec.json ${protoFile}`
  );
  printSuccess(`JSON spec generated: ${relativeDir}/protocol_spec.json`);

  // 3. generate type urls for javascript
  const results = Object.keys(typeUrls || {}).reduce((obj, url) => {
    const type = typeUrls[url].split('.').pop();
    obj[type] = url;
    return obj;
  }, {});
  fs.writeFileSync(`${targetJsDir}/protocol_url.json`, JSON.stringify(results));
  printSuccess(`type_urls json generated: ${relativeDir}/protocol_url.json`);

  // 4. generate javascript entry file
  fs.writeFileSync(
    `${targetJsDir}/index.js`,
    `// Generated by forge-cli
const provider = require('@arcblock/forge-proto/provider');
const { addProvider } = require('@arcblock/forge-message');
// const { addProvider } = require('@arcblock/forge-message/lite');
const types = require('./${protobufJsFile}');
const specs = require('./protocol_spec.json');
const urls = require('./protocol_url.json');

addProvider(provider({ types }, specs, urls));

module.exports = { types, specs, urls };
`
  );
  printSuccess(
    `JavaScript entry file generated: ${targetJsDir.replace(outputPrefix, '')}/index.js`
  );
}

async function main({ args: [dir], opts: { targets = 'elixir,javascript' } }) {
  try {
    const sourceDir = path.resolve(dir);
    const outputDir = process.cwd();
    const outputPrefix = `${outputDir}/`;
    if (!isDirectory(sourceDir)) {
      printError(`TX contract source folder ${sourceDir} not exists`);
      process.exit(1);
    }

    const configFile = path.join(sourceDir, 'config.yml');
    if (!isFile(configFile)) {
      printError(`TX contract config file ${configFile} not exists`);
      process.exit(1);
    }

    const config = yaml.parse(fs.readFileSync(configFile).toString());
    const { name, version, proto } = config;
    const protoFile = path.join(sourceDir, proto);
    printInfo(`Contract meta: ${JSON.stringify({ name, version })}`);
    print();

    // 0. prepare compile dir
    const targetDir = path.join(outputDir, '.compiled');
    shell.exec(`rm -rf ${targetDir}`, { silent: true });
    shell.exec(`mkdir ${targetDir}`);

    // 1. detect language
    const supportedLangs = ['elixir', 'javascript'];
    const targetLangs = targets
      .split(',')
      .map(x => x.trim())
      .filter(x => supportedLangs.includes(x));

    const params = { sourceDir, targetDir, config, configFile, protoFile, outputPrefix };

    // 2. compile elixir
    if (targetLangs.includes('elixir')) {
      await compileElixir(params);
    }

    // 3. compile javascript
    if (targetLangs.includes('javascript')) {
      await compileJavascript(params);
    }
  } catch (err) {
    logError(err);
    printError(`Contract compile failed: ${err.message}`);
  }
}

exports.run = main;
exports.execute = main;
exports.ensureForgeCompiler = ensureForgeCompiler;
