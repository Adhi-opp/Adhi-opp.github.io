// Local preview server with live reload. No dependencies.
//   node tools/serve.js [port]      -> http://localhost:5500
// HTML/JS edits reload the page; CSS edits swap the stylesheet in place.

const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2]) || 5500;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
};
// Served as a file, not inline, so the page's Content-Security-Policy allows it.
const client = `(() => {
  const es = new EventSource('/__reload');
  es.onmessage = e => {
    if (e.data !== 'css') return location.reload();
    document.querySelectorAll('link[rel=stylesheet]').forEach(l => {
      const u = new URL(l.href); if (u.origin !== location.origin) return;
      u.searchParams.set('v', Date.now()); l.href = u.href;
    });
  };
})();`;

const listeners = new Set();

http.createServer((req, res) => {
  // Answer only requests addressed to this machine by name, so a web page that
  // re-points its own domain at 127.0.0.1 (DNS rebinding) can't read files here.
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) { res.writeHead(403); return res.end(); }
  let url;
  try { url = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400); return res.end(); }
  if (url === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(': ok\n\n');
    listeners.add(res);
    req.on('close', () => listeners.delete(res));
    return;
  }
  if (url === '/__reload.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(client);
  }
  let file = path.join(root, url);
  // stay inside the site folder (a bare prefix check would also let in a sibling
  // like "Technical portfolio2"), and keep dot-folders such as .git private
  const rel = path.relative(root, file);
  if (path.isAbsolute(rel) || rel.split(path.sep).some((s) => s.startsWith('.'))) { res.writeHead(404); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(ext === '.html' ? buf.toString().replace('</body>', '<script src="/__reload.js"></script></body>') : buf);
  });
}).listen(port, '127.0.0.1', () => console.log(`Portfolio: http://localhost:${port}  (live reload on)`));

let timer, cssOnly = true;
fs.watch(root, { recursive: true }, (_, name) => {
  if (!name || /^(\.artifact|node_modules|tools|\.git)[\\/]/.test(name)) return;
  if (!name.endsWith('.css')) cssOnly = false;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const msg = cssOnly ? 'css' : 'reload';
    cssOnly = true;
    for (const l of listeners) l.write(`data: ${msg}\n\n`);
    console.log(`${new Date().toLocaleTimeString()}  ${msg}: ${name}`);
  }, 120);
});
