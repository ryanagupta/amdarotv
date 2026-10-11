/**
 * Amdaro TV - Dedicated Media Station X (MSX) HTTP Server for Node.js
 * Runs a zero-dependency local web server with full CORS headers, auto-detects LAN IP,
 * and dynamically substitutes {PREFIX} and {SERVER} in all JSON files.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8080;

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.vtt': 'text/vtt'
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(__dirname, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + reqPath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    if (ext === '.json') {
      fs.readFile(filePath, 'utf8', (readErr, data) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Server Error reading file');
          return;
        }

        const hostHeader = req.headers['host'] || `${getLanIp()}:${PORT}`;
        const resolved = data.replace(/\{PREFIX\}/g, 'http://').replace(/\{SERVER\}/g, hostHeader);
        const buf = Buffer.from(resolved, 'utf8');

        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': buf.length
        });
        res.end(buf);
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLanIp();
  const msxAddress = `${ip}:${PORT}`;

  console.log('='.repeat(64));
  console.log('           AMDARO TV - MEDIA STATION X SERVER (Node.js)');
  console.log('='.repeat(64));
  console.log(` Web Server Active on: http://${msxAddress}/`);
  console.log('-'.repeat(64));
  console.log(' INSTRUCTIONS FOR YOUR TV (LG webOS / Media Station X):');
  console.log(' 1. Open the "Media Station X" app on your TV.');
  console.log(' 2. Navigate to: Settings -> Start Parameter -> Setup');
  console.log(' 3. In the input box, enter ONLY this (NO forward slashes):');
  console.log(`    -->  ${msxAddress}  <--`);
  console.log(' 4. Press OK / click the checkmark.');
  console.log(' 5. Amdaro TV will automatically launch full screen!');
  console.log('='.repeat(64));
  console.log('Press Ctrl+C to stop the server.\n');
});
