const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = 4200;
const DIST_DIR = path.join(__dirname, 'dist/frontend/browser');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg'
};

const COMPRESSIBLE = new Set([
  'text/html', 'text/javascript', 'text/css',
  'application/json', 'image/svg+xml'
]);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

function getCacheControl(ext) {
  // Hashed assets (JS/CSS bundles) get long cache; HTML gets no-cache for SPA freshness
  if (ext === '.html') return 'no-cache';
  if (ext === '.js' || ext === '.css') return 'public, max-age=31536000, immutable';
  if (ext === '.png' || ext === '.jpg' || ext === '.gif' || ext === '.svg') return 'public, max-age=86400';
  if (ext === '.woff' || ext === '.woff2') return 'public, max-age=31536000, immutable';
  return 'public, max-age=3600';
}

function sendResponse(req, res, statusCode, contentType, content) {
  const headers = {
    'Content-Type': contentType,
    ...SECURITY_HEADERS
  };

  const ext = path.extname(req.url || '');
  headers['Cache-Control'] = getCacheControl(ext === '' ? '.html' : ext);

  // Gzip compress text-based responses
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (COMPRESSIBLE.has(contentType) && acceptEncoding.includes('gzip')) {
    zlib.gzip(content, (err, compressed) => {
      if (err) {
        res.writeHead(statusCode, headers);
        res.end(content, 'utf-8');
        return;
      }
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
      res.writeHead(statusCode, headers);
      res.end(compressed);
    });
    return;
  }

  res.writeHead(statusCode, headers);
  res.end(content, 'utf-8');
}

const server = http.createServer((req, res) => {
  // Strip query strings
  const urlPath = (req.url || '/').split('?')[0];
  const filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback - serve index.html for unknown routes
        fs.readFile(path.join(DIST_DIR, 'index.html'), (fallbackErr, fallbackContent) => {
          if (fallbackErr) {
            res.writeHead(500);
            res.end('Server error');
            return;
          }
          sendResponse(req, res, 200, 'text/html', fallbackContent);
        });
      } else {
        res.writeHead(500);
        res.end('Server error: ' + err.code);
      }
    } else {
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      sendResponse(req, res, 200, contentType, content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
