import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePhoto, workingDimensions } from '../src/logic.js';

const MB = 1024 * 1024;

test('chooser and drop validation accepts JPEG, PNG and WebP up to 100 MB', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.equal(validatePhoto({ type, size: 100 * MB }), '');
  }
  assert.equal(validatePhoto({ type: 'image/gif', size: 1 }), 'Choose a JPEG, PNG or WebP image.');
  assert.equal(validatePhoto({ type: 'image/png', size: 100 * MB + 1 }), 'Choose an image no larger than 100 MB.');
  assert.equal(validatePhoto({ type: 'image/png', size: 0 }), 'Choose a non-empty image.');
  assert.equal(validatePhoto(null), 'Choose a JPEG, PNG or WebP image.');
});

test('working copy caps longest side without upscaling and preserves portrait, landscape and square ratios', () => {
  assert.deepEqual(workingDimensions(4000, 3000), { width: 1600, height: 1200 });
  assert.deepEqual(workingDimensions(3000, 4000), { width: 1200, height: 1600 });
  assert.deepEqual(workingDimensions(2000, 2000), { width: 1600, height: 1600 });
  assert.deepEqual(workingDimensions(800, 600), { width: 800, height: 600 });
  assert.deepEqual(workingDimensions(600, 800), { width: 600, height: 800 });
  assert.deepEqual(workingDimensions(0, 1), null);
});

test('Explore chooser and drop keep samples and challenges intact, reject safely, and ignore stale decoding', async () => {
  const nodes = new Map();
  const pending = [];
  const sampleImages = [];
  const revoked = [];
  const calls = [];
  let nextUrl = 0;
  const node = id => {
    if (!nodes.has(id)) {
      const listeners = {};
      nodes.set(id, {
        id, hidden: false, checked: false, value: id === 'resolution' ? '2' : '0',
        textContent: '', dataset: {}, width: 640, height: 480, files: [],
        attributes: {}, classList: { toggle() {}, add() {}, remove() {} },
        setAttribute(key, value) { this.attributes[key] = value; }, getAttribute(key) { return this.attributes[key]; },
        addEventListener(type, handler) { listeners[type] = handler; },
        fire(type, extra = {}) { return listeners[type]?.({ target: this, preventDefault() {}, ...extra }); },
        querySelectorAll() { return []; },
        querySelector(selector) { return selector === 'option[value="photo"]' ? node('photo-option') : null; },
        getContext() { return { clearRect() {}, drawImage(...args) { calls.push([id, ...args]); }, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }; },
      });
    }
    return nodes.get(id);
  };
  const old = { document: globalThis.document, Image: globalThis.Image, URL: globalThis.URL, window: globalThis.window };
  globalThis.document = { querySelector: selector => node(selector.slice(1)), createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage(...args) { calls.push(['offscreen', ...args]); } }) }) };
  globalThis.window = { scrollTo() {} };
  globalThis.URL = { createObjectURL: () => `blob:${++nextUrl}`, revokeObjectURL: url => revoked.push(url) };
  globalThis.Image = class {
    constructor() { this.complete = false; this.naturalWidth = 0; this.naturalHeight = 0; this.listeners = {}; }
    set src(value) {
      this.source = value;
      if (value.startsWith('data:')) {
        sampleImages.push(this);
        if (sampleImages.length !== 1) { this.complete = true; this.naturalWidth = 320; this.naturalHeight = 240; }
      } else pending.push(this);
    }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    fire(type, width = 4000, height = 3000) {
      this.complete = type === 'load';
      this.naturalWidth = width; this.naturalHeight = height;
      this.listeners[type]?.();
      this[`on${type}`]?.();
    }
  };
  try {
    await import(`../src/app.js?photo-test=${Date.now()}`);
    assert.equal(node('preview-size').textContent, '32 × 24 px');
    assert.match(node('explore').innerHTML, /id="upload-label"[^>]*>Drag and drop the image here<\/label>/);
    const jpeg = { type: 'image/jpeg', size: 5, name: 'portrait.jpg' };
    node('photo-input').files = [jpeg]; node('photo-input').fire('change');
    assert.equal(pending.length, 1);
    pending[0].fire('load', 3000, 4000);
    assert.equal(node('source-size').textContent, 'Working image: 1200 × 1600 px (original file unchanged)');
    assert.equal(node('preview-size').textContent, '1200 × 1600 px');
    assert.equal(node('resolution').value, node('resolution').max);
    assert.equal(node('resolution').getAttribute?.('aria-valuetext'), '1200 × 1600 px');
    assert.equal(node('image-select').value, 'photo');
    assert.match(node('explore').innerHTML, /<option value="photo"/);
    assert.equal(node('original').height, 640);
    assert.equal(node('original').width, 480);
    assert.equal(node('preview').height, 640);
    assert.ok(calls.some(c => c[0] === 'offscreen' && c[4] === 1200 && c[5] === 1600), 'full-detail preview samples working dimensions');
    const drawsBeforeStaleSample = calls.length;
    sampleImages[0].fire('load', 320, 240);
    assert.equal(calls.length, drawsBeforeStaleSample, 'late sample load must not paint over the photo');
    assert.equal(node('resolution').max, '5');
    assert.match(node('range-ticks').innerHTML, /128 px<\/span><span>1200 px/);
    for (const [index, expected] of ['8 × 11 px', '16 × 21 px', '32 × 43 px', '64 × 85 px', '128 × 171 px'].entries()) {
      node('resolution').value = String(index); node('resolution').fire('input');
      assert.equal(node('preview-size').textContent, expected);
      assert.equal(node('resolution').getAttribute('aria-valuetext'), expected);
    }
    node('resolution').value = '0'; node('resolution').fire('input');
    assert.equal(node('preview-size').textContent, '8 × 11 px');
    assert.equal(node('total').textContent, '88');
    node('resolution').value = '2'; node('resolution').fire('input');
    assert.equal(node('preview-size').textContent, '32 × 43 px');
    assert.equal(node('photo-error').textContent, '');
    assert.ok(calls.some(c => c[0] === 'original'));
    const current = node('source-size').textContent;
    node('drop-zone').fire('drop', { dataTransfer: { files: [{ type: 'image/gif', size: 10 }] } });
    assert.equal(node('photo-error').textContent, 'Choose a JPEG, PNG or WebP image.');
    assert.equal(node('source-size').textContent, current);
    assert.equal(node('image-select').value, 'photo');
    assert.equal(node('preview-size').textContent, '32 × 43 px');
    assert.equal(node('resolution').value, '2');
    node('photo-input').files = [{ type: 'image/png', size: 101 * MB }]; node('photo-input').fire('change');
    assert.equal(node('photo-error').textContent, 'Choose an image no larger than 100 MB.');
    assert.equal(node('source-size').textContent, current);
    node('drop-zone').fire('drop', { dataTransfer: { files: [{ type: 'image/webp', size: 5 }] } });
    pending[1].fire('error');
    assert.equal(node('photo-error').textContent, 'Could not read this image. Try another JPEG, PNG or WebP file.');
    assert.equal(node('source-size').textContent, current);
    assert.equal(node('resolution').value, '2');
    node('photo-input').files = [{ type: 'image/png', size: 5 }]; node('photo-input').fire('change');
    node('photo-input').files = [{ type: 'image/jpeg', size: 5 }]; node('photo-input').fire('change');
    pending[3].fire('load', 800, 600);
    pending[2].fire('load', 4000, 3000);
    assert.equal(node('source-size').textContent, 'Working image: 800 × 600 px (original file unchanged)');
    assert.equal(node('preview-size').textContent, '800 × 600 px');
    assert.equal(node('resolution').value, node('resolution').max);
    assert.deepEqual(revoked, ['blob:1', 'blob:2', 'blob:3', 'blob:4']);
    node('drop-zone').fire('drop', { dataTransfer: { files: [{ type: 'image/png', size: 5 }] } });
    pending[4].fire('load', 1, 1600);
    assert.equal(node('source-size').textContent, 'Working image: 1 × 1600 px (original file unchanged)');
    assert.equal(node('preview-size').textContent, '1 × 1600 px');
    assert.equal(node('width').textContent, '1 px');
    assert.equal(node('height').textContent, '1600 px');
    assert.equal(node('total').textContent, '1,600');
    assert.equal(node('original').width, 1);
    assert.equal(node('original').height, 640);
    assert.equal(node('preview').width, 1);
    assert.equal(node('preview').height, 640);
    assert.equal(node('resolution').value, node('resolution').max);
    assert.equal(node('resolution').getAttribute('aria-valuetext'), '1 × 1600 px');
    assert.match(node('explore').innerHTML, /id="resolution"/);
    node('image-select').value = '0'; node('image-select').fire('change');
    assert.equal(node('source-size').textContent, 'Sample illustration: 320 × 240 px');
    assert.equal(node('preview-size').textContent, '32 × 24 px');
    assert.equal(node('resolution').max, '4');
    assert.equal(node('resolution').value, '2');
    assert.match(node('range-ticks').innerHTML, /<span>8 px<\/span>/);
    assert.ok(calls.some(c => c[0] === 'offscreen' && c[1].source?.startsWith('data:')));
    node('image-select').value = '1'; node('image-select').fire('change');
    assert.equal(node('source-size').textContent, 'Sample illustration: 320 × 240 px');
    node('drop-zone').fire('drop', { dataTransfer: { files: [{ type: 'image/png', size: 5 }] } });
    pending[5].fire('load', 1600, 1);
    assert.equal(node('preview-size').textContent, '1600 × 1 px');
    assert.equal(node('resolution').value, '5');
    assert.equal(node('original').width, 640);
    assert.equal(node('preview').height, 1);
    node('image-select').value = '2'; node('image-select').fire('change');
    assert.equal(node('resolution').value, '2');
    assert.equal(node('resolution').max, '4');
    assert.equal(node('preview-size').textContent, '32 × 24 px');
    node('photo-input').files = [{ type: 'image/jpeg', size: 5 }]; node('photo-input').fire('change');
    node('image-select').fire('change');
    pending[6].fire('load');
    assert.equal(node('source-size').textContent, 'Sample illustration: 320 × 240 px');
    node('challenge-tab').fire('click');
    assert.equal(node('challenge').hidden, false);
    assert.equal(node('explore').hidden, true);
    assert.equal(nextUrl, 7); // browser-local object URLs, no upload request
    assert.deepEqual(revoked, ['blob:1', 'blob:2', 'blob:3', 'blob:4', 'blob:5', 'blob:6', 'blob:7']);
  } finally {
    Object.assign(globalThis, old);
  }
});
