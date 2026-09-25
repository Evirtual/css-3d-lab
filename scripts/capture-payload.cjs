/**
 * Catches one real capture payload from the page, so the same bytes can be replayed to BOTH
 * renderers. Without this the comparison is two different requests and proves nothing.
 *
 *   node .media-tmp/collect-payload.cjs      then take a picture on http://localhost:5183
 *
 * Writes .media-tmp/payload.json and exits.
 */
const http = require('http');
const { writeFileSync } = require('fs');

const server = http.createServer((req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.method !== 'POST') { res.writeHead(200).end('collector'); return; }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    writeFileSync('.media-tmp/payload.json', body);
    const p = JSON.parse(body.toString());
    console.log(`caught ${(body.length / 1024).toFixed(0)} KB: ${p.width}x${p.height} scale ${p.scale} frame ${p.frame} count ${p.count}`);
    res.writeHead(204).end();
    server.close(() => process.exit(0));
  });
});
server.listen(8790, '127.0.0.1', () => console.log('collector on http://127.0.0.1:8790 — take a picture now'));
