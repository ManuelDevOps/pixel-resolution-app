import test from 'node:test';
import assert from 'node:assert/strict';
import { initTvLab } from '../src/tv-lab.js';

function lab() {
  const nodes = new Map();
  const pending = [];
  const defaults = [];
  let cssWidth = 800;
  let dpr = 2;
  let failNextScreen = false;
  let observed;
  const previous = { document: globalThis.document, Image: globalThis.Image, URL: globalThis.URL, window: globalThis.window, MutationObserver: globalThis.MutationObserver };
  function canvas(isScreen = false) {
    return { width: 640, height: 360, style: {}, draws: [], parentElement: { getBoundingClientRect: () => ({ width: cssWidth, height: cssWidth * 9 / 16 }) },
      getContext() { return { save() {}, restore() {}, scale() {}, fillRect() {}, clearRect() {}, beginPath() {}, arc() {}, fill() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, stroke() {}, strokeRect() {}, fillText() {}, setTransform() {}, drawImage(...args) { if (isScreen && failNextScreen) { failNextScreen = false; throw new Error('render'); } this.canvas.draws.push(args); }, canvas: this }; } };
  }
  function node(selector) {
    if (!nodes.has(selector)) {
      const listeners = {};
      nodes.set(selector, /^\[data-tv-(size|zoom)=/.test(selector) ? canvas(selector.startsWith('[data-tv-size=')) : {
        hidden: selector === '#tv-closeups' || selector === '#tv-zoom-note', textContent: '', value: '', attributes: {}, style: {}, files: [],
        classList: { add() {}, remove() {} }, setPointerCapture() {},
        addEventListener(type, fn) { listeners[type] = fn; }, setAttribute(key, value) { this.attributes[key] = value; },
        fire(type, extra = {}) { listeners[type]?.({ currentTarget: this, target: this, preventDefault() {}, ...extra }); },
        getBoundingClientRect() { return { width: 22 }; },
      });
    }
    return nodes.get(selector);
  }
  const root = { innerHTML: '', querySelector: node, querySelectorAll() { return []; } };
  globalThis.document = { createElement: () => canvas() };
  globalThis.MutationObserver = class { constructor(callback) { observed = callback; } observe() {} };
  globalThis.window = { get devicePixelRatio() { return dpr; }, addEventListener() {}, removeEventListener() {} };
  globalThis.URL = { createObjectURL: () => `blob:${pending.length + 1}`, revokeObjectURL() {} };
  globalThis.Image = class { set src(url) { this.url = url; (url === '/assets/landscape-720p.png' ? defaults : pending).push(this); } fire(type, width, height) { this.naturalWidth = width; this.naturalHeight = height; this[`on${type}`]?.(); } };
  return { root, node, pending, defaults, failRender() { failNextScreen = true; }, show() { root.hidden = false; observed(); }, layout(width, ratio = dpr) { cssWidth = width; dpr = ratio; }, upload(width, height) { node('#tv-photo-input').files = [{ type: 'image/png', size: 100 }]; node('#tv-photo-input').fire('change'); pending.at(-1).fire('load', width, height); }, close() { Object.assign(globalThis, previous); } };
}

const screen = (node, size = 70) => node(`[data-tv-size="${size}"]`);
const shown = canvas => canvas.draws.at(-1)?.[0];

test('TV Lab shows no detail explanation or simulation notes; image detail stays for screen readers', () => {
  const h = lab();
  try {
    initTvLab(h.root);
    const html = h.root.innerHTML;
    for (const text of ['IMAGE DETAIL', 'A decoded image is 4K', 'The images start at the same size', 'This is a simplified simulation']) assert.ok(!html.includes(text), text);
    assert.match(html, /<p id="tv-image-info" class="sr-only" aria-live="polite"><\/p>/);
  } finally { h.close(); }
});

test('a rejected or empty drop does not cancel the pending included image', () => {
  for (const files of [[{ type: 'image/gif', size: 10 }], []]) {
    const h = lab();
    try {
      initTvLab(h.root);
      h.node('#tv-drop-zone').fire('drop', { dataTransfer: { files } });
      assert.notEqual(h.node('#tv-photo-error').textContent, '');
      assert.equal(h.pending.length, 0);
      h.defaults[0].fire('load', 1280, 720);
      assert.match(h.node('#tv-image-info').textContent, /Included landscape: 1,280 × 720 px/);
      assert.equal(shown(screen(h.node)).draws.at(-1)[0], h.defaults[0]);
    } finally { h.close(); }
  }
});

test('included landscape starts as exact HD on every TV and only blurs when stretched', () => {
  const h = lab();
  try {
    initTvLab(h.root);
    assert.equal(h.defaults.length, 1);
    h.defaults[0].fire('load', 1280, 720);
    for (const size of [32, 45, 70]) {
      assert.equal(shown(screen(h.node, size)).draws.at(-1)[0], h.defaults[0]);
      assert.equal(screen(h.node, size).style.filter, 'none');
    }
    assert.match(h.node('#tv-image-info').textContent, /Included landscape: 1,280 × 720 px.*Automatic HD simulation: 1,280 × 720 px/);
    const before = [32, 45, 70].map(size => screen(h.node, size).getContext().canvas.draws.length);
    h.node('[data-tv-stretch="70"]').value = '50'; h.node('[data-tv-stretch="70"]').fire('input');
    assert.notEqual(screen(h.node, 70).style.filter, 'none');
    assert.equal(screen(h.node, 45).style.filter, 'none');
    h.node('#tv-look-closer').fire('click');
    assert.equal(shown(h.node('[data-tv-zoom="70"]')).draws.at(-1)[0], h.defaults[0]);
    assert.ok(before.every(n => n > 0));
  } finally { h.close(); }
});

test('late included image cannot replace a user upload; failed load leaves fallback interactive', () => {
  const h = lab();
  try {
    initTvLab(h.root);
    h.upload(3840, 2160);
    const selected = shown(screen(h.node));
    h.defaults[0].fire('load', 1280, 720);
    assert.equal(shown(screen(h.node)), selected);
    assert.match(h.node('#tv-image-info').textContent, /Automatic 4K/);
  } finally { h.close(); }
  const failed = lab();
  try {
    initTvLab(failed.root);
    failed.defaults[0].fire('error');
    assert.ok(shown(screen(failed.node)));
    failed.upload(1280, 720);
    assert.match(failed.node('#tv-image-info').textContent, /Automatic HD/);
  } finally { failed.close(); }
});

test('automatic UHD boundary uses decoded dimensions before capping, including portrait and either shortfall', () => {
  const h = lab();
  try {
    initTvLab(h.root);
    assert.match(h.node('#tv-image-info').textContent, /automatic.*4K/i);
    for (const [w, height, is4k] of [[3840, 2160, true], [2160, 3840, true], [5000, 2800, true], [3839, 2160, false], [3840, 2159, false], [2159, 3840, false], [1920, 1080, false]]) {
      h.upload(w, height);
      const info = h.node('#tv-image-info').textContent;
      assert.match(info, new RegExp(`${w.toLocaleString('en-GB')} × ${height.toLocaleString('en-GB')}`));
      assert.match(info, is4k ? /automatic.*4K/i : /automatic.*HD/i);
      const image = shown(screen(h.node));
      if (is4k) assert.ok(Math.max(image.width, image.height) > 1280);
      else assert.ok(image.width <= 1280 && image.height <= 720);
      h.node('[data-tv-stretch="70"]').value = '100'; h.node('[data-tv-stretch="70"]').fire('input');
      assert.equal(screen(h.node).style.filter === 'none', is4k);
    }
    h.upload(5000, 2800);
    assert.match(h.node('#tv-image-info').textContent, /5,000 × 2,800.*3,840 × 2,150/s);
    assert.equal(shown(screen(h.node)).width, 3840);
    assert.equal(screen(h.node).style.filter, 'none');
    assert.doesNotMatch(h.root.innerHTML, /id="tv-(hd|original)"/);
  } finally { h.close(); }
});

test('auto HD survives prior 4K and rejection; initial example and look closer remain coherent', () => {
  const h = lab();
  try {
    initTvLab(h.root);
    assert.match(h.node('#tv-image-info').textContent, /automatic.*4K/i);
    h.upload(3840, 2160);
    h.upload(1920, 1080);
    assert.deepEqual([shown(screen(h.node)).width, shown(screen(h.node)).height], [1280, 720]);
    h.node('[data-tv-stretch="70"]').value = '100'; h.node('[data-tv-stretch="70"]').fire('input');
    assert.notEqual(screen(h.node).style.filter, 'none');
    h.node('#tv-look-closer').fire('click');
    assert.equal(shown(h.node('[data-tv-zoom="70"]')), shown(screen(h.node)));
    const before = h.node('#tv-image-info').textContent;
    h.node('#tv-drop-zone').fire('drop', { dataTransfer: { files: [{ type: 'image/gif', size: 1 }] } });
    assert.equal(h.node('#tv-photo-error').textContent, 'Choose a JPEG, PNG or WebP image.');
    assert.equal(h.node('#tv-image-info').textContent, before);
    assert.notEqual(screen(h.node).style.filter, 'none');
    h.upload(3840, 2160);
    assert.equal(screen(h.node).style.filter, 'none');
  } finally { h.close(); }
});

test('main preview uses displayed size and DPR, recovers hidden layout and avoids extra allocations on stretch', () => {
  const h = lab();
  try {
    h.layout(0);
    initTvLab(h.root);
    const canvas = screen(h.node);
    h.layout(800);
    h.show();
    assert.deepEqual([canvas.width, canvas.height], [1600, 900]);
    h.node('[data-tv-stretch="70"]').value = '50'; h.node('[data-tv-stretch="70"]').fire('input');
    assert.deepEqual([canvas.width, canvas.height], [1600, 900]);
    h.layout(1200, 3);
    h.show();
    assert.ok(canvas.width <= 3840 && canvas.height <= 2160);
    h.upload(1920, 1080);
    assert.ok(canvas.width <= 1280 && canvas.height <= 720);
  } finally { h.close(); }
});

test('a failed replacement render restores automatic quality, stretching and prior image', () => {
  const h = lab();
  try {
    initTvLab(h.root);
    h.upload(1920, 1080);
    h.node('[data-tv-stretch="70"]').value = '100'; h.node('[data-tv-stretch="70"]').fire('input');
    const old = shown(screen(h.node));
    const info = h.node('#tv-image-info').textContent;
    h.failRender();
    h.upload(3840, 2160);
    assert.match(h.node('#tv-photo-error').textContent, /Could not read/);
    assert.equal(h.node('#tv-image-info').textContent, info);
    assert.equal(shown(screen(h.node)), old);
    assert.equal(h.node('[data-tv-stretch="70"]').value, '100');
    assert.notEqual(screen(h.node).style.filter, 'none');
    h.upload(3840, 2160);
    assert.match(h.node('#tv-image-info').textContent, /Automatic 4K/);
    assert.equal(screen(h.node).style.filter, 'none');
  } finally { h.close(); }
});
