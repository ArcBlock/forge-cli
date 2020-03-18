const path = require('path');
const finalhandler = require('finalhandler');
const http = require('http');
const serveStatic = require('serve-static');

const serve = serveStatic(
  path.join(__dirname, '../../../../node_modules/@arcblock/forge-web/build'),
  {
    index: ['index.html', 'index.htm'],
  }
);

const server = http.createServer((req, res) => serve(req, res, finalhandler(req, res)));

server.listen(process.env.FORGE_WEB_PROT || 3000);
