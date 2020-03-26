/* eslint-disable no-console */
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const http = require('http');
const serveStatic = require('serve-static');
const { URL } = require('url');

const { ABT_NETWORKS_PATH, ABT_NETWORKS_URL } = require('../../../constant');

const getRemoteNetworks = async () => {
  const networks = [];
  try {
    const { data } = await axios.get(ABT_NETWORKS_URL, { timeout: 10 * 1000 });
    if (Array.isArray(data)) {
      networks.push(...data);
    }
  } catch (error) {
    console.log(error);
  }

  return networks;
};

const responseNetworks = res => {
  try {
    const tmp = fs
      .readFileSync(ABT_NETWORKS_PATH)
      .toString()
      .trim();

    const networks = tmp ? JSON.parse(tmp) : [];
    getRemoteNetworks().then(remoteNetworks => {
      networks.push(...remoteNetworks);

      res.setHeader('content-type', 'text/javascript');
      res.write(`window.ARCBLOCK_NETWORKS=${JSON.stringify(networks)}`);
      res.end();
    });
  } catch (error) {
    console.log('response networks.js failed', error);
    res.end();
  }
};

const filesPath = path.join(__dirname, '../../../../node_modules/@arcblock/forge-web');
const serve = serveStatic(filesPath, {
  index: ['index.html', 'index.htm'],
});

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http:${req.headers.host}`);
    if (url.pathname === '/dashboard') {
      req.url = `/${url.search}`;
    }

    if (req.url === '/static/js/networks.js') {
      return responseNetworks(res);
    }
  } catch (error) {
    console.error(error);
  }

  return serve(req, res, () => {
    res.write(fs.readFileSync(path.join(filesPath, 'index.html')).toString());
    res.end();
  });
});

server.listen(process.env.FORGE_WEB_PROT);
