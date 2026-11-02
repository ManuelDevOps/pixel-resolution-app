import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initTheme } from '../src/theme.js';

function fixture(saved = null, blocked = false) {
  const events = {};
  const button = {
    textContent: '', attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, listener) { events[name] = listener; },
    click() { events.click(); },
  };
  const root = {
    dataset: {},
    querySelector(selector) { return selector === '#theme-toggle' ? button : null; },
  };
  root.documentElement = root;
  const calls = [];
  const storage = {
    getItem(key) { calls.push(['get', key]); if (blocked) throw Error('denied'); return saved; },
    setItem(key, value) { calls.push(['set', key, value]); if (blocked) throw Error('denied'); saved = value; },
  };
  return { root, button, storage, calls, get saved() { return saved; } };
}

test('visible button exposes destination and theme without resetting document content', () => {
  const f = fixture();
  f.root.content = { image: 'photo', resolution: 32, challenge: 'round 2', tv: { quality: 'auto', stretch: 75, zoom: 2 } };
  const content = f.root.content;
  initTheme(f.root, f.storage);
  assert.equal(f.root.dataset.theme, undefined);
  assert.equal(f.button.textContent, 'Cyber theme');
  assert.equal(f.button.attributes['aria-label'], 'Cyber theme');
  assert.equal(f.button.attributes['aria-pressed'], undefined);
  f.button.click();
  assert.equal(f.root.dataset.theme, 'cyber');
  assert.equal(f.button.textContent, 'Standard theme');
  assert.equal(f.button.attributes['aria-label'], 'Standard theme');
  assert.equal(f.button.attributes['aria-pressed'], undefined);
  assert.equal(f.saved, 'cyber');
  assert.equal(f.root.content, content);
  assert.deepEqual(f.root.content, { image: 'photo', resolution: 32, challenge: 'round 2', tv: { quality: 'auto', stretch: 75, zoom: 2 } });
  f.button.click();
  assert.equal(f.root.dataset.theme, undefined);
  assert.equal(f.button.textContent, 'Cyber theme');
  assert.equal(f.button.attributes['aria-pressed'], undefined);
  assert.equal(f.saved, 'standard');
});

test('restores cyber in the same session and ignores unknown stored theme', () => {
  const f = fixture('cyber');
  initTheme(f.root, f.storage);
  assert.equal(f.root.dataset.theme, 'cyber');
  assert.equal(f.button.textContent, 'Standard theme');
  assert.deepEqual(f.calls, [['get', 'pixel-lab-theme']]);
  const unknown = fixture('unexpected');
  initTheme(unknown.root, unknown.storage);
  assert.equal(unknown.root.dataset.theme, undefined);
  assert.equal(unknown.button.textContent, 'Cyber theme');
  assert.equal(unknown.saved, 'unexpected');
});

test('blocked session storage does not prevent switching', () => {
  const f = fixture(null, true);
  assert.doesNotThrow(() => initTheme(f.root, f.storage));
  assert.equal(f.button.textContent, 'Cyber theme');
  assert.doesNotThrow(() => f.button.click());
  assert.equal(f.root.dataset.theme, 'cyber');
  assert.equal(f.button.textContent, 'Standard theme');
  assert.doesNotThrow(() => f.button.click());
  assert.equal(f.root.dataset.theme, undefined);
  assert.equal(f.button.textContent, 'Cyber theme');
  const getterBlocked = { get sessionStorage() { throw Error('denied'); } };
  let storage;
  assert.doesNotThrow(() => { try { storage = getterBlocked.sessionStorage; } catch { /* app fallback */ } initTheme(f.root, storage); });
  assert.equal(f.button.textContent, 'Cyber theme');
});

test('a stored Cyber choice applies before the first paint, and other values do not', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  const script = head.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'index.html needs an inline head script');
  assert.ok(head.indexOf('<script>') < head.indexOf('stylesheet'), 'theme is set before the stylesheet');
  const run = sessionStorage => {
    const documentElement = { dataset: {} };
    new Function('document', 'sessionStorage', script)({ documentElement }, sessionStorage);
    return documentElement.dataset.theme;
  };
  assert.equal(run({ getItem: () => 'cyber' }), 'cyber');
  for (const stored of [null, 'standard', 'CYBER', '']) assert.equal(run({ getItem: () => stored }), undefined);
  assert.doesNotThrow(() => run({ getItem() { throw Error('denied'); } }));
  assert.equal(run({ getItem() { throw Error('denied'); } }), undefined);
});

test('toggle is a native button, wired into app, and alternate skin is scoped', async () => {
  const [html, app, css] = await Promise.all(['../index.html', '../src/app.js', '../src/style.css'].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.match(html, /<button id="theme-toggle"[^>]*>Cyber theme<\/button>/);
  assert.match(app, /initTheme\(document, storage\)/);
  assert.match(css, /html\[data-theme="cyber"\]/);
  assert.match(css, /prefers-reduced-motion/);
});
