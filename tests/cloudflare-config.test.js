import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('the Cloudflare Worker serves only the custom domain, without workers.dev', () => {
  const config = JSON.parse(read('wrangler.jsonc'));
  assert.equal(config.name, 'pixel-resolution-app');
  assert.equal(config.workers_dev, false);
  assert.deepEqual(config.routes, [{ pattern: 'pixelresolution.applications4education.com', custom_domain: true }]);
  assert.deepEqual(config.assets, { directory: './' });
});

test('only the app files are published: everything else is ignored by default', () => {
  const rules = read('.assetsignore').split(/\r?\n/).filter(line => line && !line.startsWith('#'));
  assert.deepEqual(rules, ['*', '!index.html', '!_headers', '!src/', '!src/**', '!assets/', '!assets/**']);
});

test('every file the page loads is inside the published allow list', () => {
  const published = path => path === 'index.html' || path === '_headers' || path.startsWith('src/') || path.startsWith('assets/');
  const pageRefs = [...read('index.html').matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1])
    .filter(ref => !/^(?:https?:|data:|mailto:|#|\/$)/.test(ref));
  const assetRefs = ['src/app.js', 'src/tv-lab.js', 'src/style.css']
    .flatMap(file => [...read(file).matchAll(/\/(assets\/[A-Za-z0-9._-]+)/g)].map(match => match[1]));
  assert.ok(assetRefs.length >= 2);
  for (const ref of [...pageRefs, ...assetRefs]) assert.ok(published(ref.replace(/^\//, '')), `${ref} is loaded but not published`);
});

test('published files keep the local server nosniff header', () => {
  assert.match(read('_headers'), /^\/\*\r?\n\s+X-Content-Type-Options: nosniff/m);
});
