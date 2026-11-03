import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { createHash } from 'node:crypto';

function get(port, path) {
  return new Promise((resolve, reject) => {
    const call = request({ hostname: '127.0.0.1', port, path }, response => {
      const chunks = [];
      response.on('data', chunk => { chunks.push(chunk); });
      response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString('utf8'), bytes: Buffer.concat(chunks), headers: response.headers }));
    });
    call.on('error', reject);
    call.end();
  });
}

test('malformed request targets return a client error without stopping the public server', { timeout: 10000 }, async t => {
  const reservation = createServer();
  const port = await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', () => resolve(reservation.address().port));
  });
  await new Promise((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('..', import.meta.url), env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
      await new Promise(resolve => child.once('exit', resolve));
    }
  });

  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => reject(new Error(`server exited before listening: ${code ?? signal}; ${stderr}`)));
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
      if (stdout === `Pixel Lab is running at http://127.0.0.1:${port}\n`) resolve();
    });
  });
  assert.equal(stdout, `Pixel Lab is running at http://127.0.0.1:${port}\n`);
  assert.equal(stderr, '');

  for (const path of ['//', '///', '//?x=1']) {
    const result = await get(port, path);
    assert.equal(result.status, 400, path);
    assert.equal(result.body, 'Bad request', path);
    assert.equal(stderr, '', path);
    assert.equal(child.exitCode, null, path);
  }

  const home = await get(port, '/?x=1');
  assert.equal(home.status, 200);
  assert.match(home.body, /<html/);
  assert.equal(home.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(home.headers['x-content-type-options'], 'nosniff');
  const script = await get(port, '/src/logic.js');
  assert.equal(script.status, 200);
  assert.equal(script.headers['content-type'], 'text/javascript; charset=utf-8');
  assert.equal(script.headers['x-content-type-options'], 'nosniff');
  assert.match(script.body, /export /);
  const tvLab = await get(port, '/src/tv-lab.js');
  assert.equal(tvLab.status, 200);
  assert.equal(tvLab.headers['content-type'], 'text/javascript; charset=utf-8');
  assert.equal(tvLab.headers['x-content-type-options'], 'nosniff');
  assert.match(tvLab.body, /initTvLab/);
  const jumper = await get(port, '/src/jumper-lab.js');
  assert.equal(jumper.status, 200);
  assert.equal(jumper.headers['content-type'], 'text/javascript; charset=utf-8');
  assert.equal(jumper.headers['x-content-type-options'], 'nosniff');
  assert.match(jumper.body, /initJumperLab/);
  const theme = await get(port, '/src/theme.js');
  assert.equal(theme.status, 200);
  assert.equal(theme.headers['content-type'], 'text/javascript; charset=utf-8');
  assert.equal(theme.headers['x-content-type-options'], 'nosniff');
  assert.match(theme.body, /export function initTheme/);
  const photo = await get(port, '/assets/landscape-720p.png');
  assert.equal(photo.status, 200);
  assert.equal(photo.headers['content-type'], 'image/png');
  assert.equal(photo.headers['x-content-type-options'], 'nosniff');
  assert.equal(photo.bytes.length, 1383235);
  assert.equal(createHash('sha256').update(photo.bytes).digest('hex'), 'f8acee575dbd22d23127934931c89a19f77f01ce0ab7782f26d0924338183615');
  const tvPhoto = await get(port, '/assets/tv-photo.png');
  assert.equal(tvPhoto.status, 200);
  assert.equal(tvPhoto.headers['content-type'], 'image/png');
  assert.equal(tvPhoto.headers['x-content-type-options'], 'nosniff');
  assert.equal(tvPhoto.bytes.length, 1440875);
  assert.equal(createHash('sha256').update(tvPhoto.bytes).digest('hex'), '26f14289474fad4c7903c9e7255e0e142ce7c1883c9518bc29fc898ef969b5c9');
  for (const path of ['/assets/other.png', '/assets/../server.js', '/assets/%2e%2e/server.js', '/assets/landscape-720p.png/other', '/assets/tv-photo.png/other', '/assets/%2e%2e/tv-photo.png', '/assets/tv-photo.png%2fother', '/src/theme.js/other', '/src/jumper-lab.js/x', '/src/Jumper-lab.js']) {
    const forbidden = await get(port, path);
    assert.equal(forbidden.status, 404, path);
    assert.equal(forbidden.body, 'Not found', path);
  }
  const missing = await get(port, '/not-allowed');
  assert.equal(missing.status, 404);
  assert.equal(missing.body, 'Not found');
  assert.equal(stderr, '');
  assert.equal(stdout, `Pixel Lab is running at http://127.0.0.1:${port}\n`);
  assert.equal(child.exitCode, null);
});
