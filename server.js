import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

// Deliberately serve only the application files, not arbitrary paths.
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/src/style.css', ['src/style.css', 'text/css; charset=utf-8']],
  ['/src/app.js', ['src/app.js', 'text/javascript; charset=utf-8']],
  ['/src/logic.js', ['src/logic.js', 'text/javascript; charset=utf-8']],
  ['/src/tv-lab.js', ['src/tv-lab.js', 'text/javascript; charset=utf-8']],
]);
const port = Number(process.env.PORT || 3000);
createServer(async (request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url, 'http://localhost').pathname;
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  const entry = files.get(pathname);
  if (!entry) { response.writeHead(404).end('Not found'); return; }
  try {
    const content = await readFile(new URL(entry[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': entry[1], 'X-Content-Type-Options': 'nosniff' }).end(content);
  } catch {
    response.writeHead(500).end('Could not load application');
  }
}).listen(port, '127.0.0.1', () => console.log(`Pixel Lab is running at http://127.0.0.1:${port}`));
