import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { createServer } from 'node:net';

function get(port, path) {
  return new Promise((resolve, reject) => {
    const call = request({ hostname: '127.0.0.1', port, path }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body, headers: response.headers }));
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
  const missing = await get(port, '/not-allowed');
  assert.equal(missing.status, 404);
  assert.equal(missing.body, 'Not found');
  assert.equal(stderr, '');
  assert.equal(stdout, `Pixel Lab is running at http://127.0.0.1:${port}\n`);
  assert.equal(child.exitCode, null);
});
