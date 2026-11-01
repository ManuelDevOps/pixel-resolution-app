import test from 'node:test';
import assert from 'node:assert/strict';

const readError = 'Could not read this image. Try another JPEG, PNG or WebP file.';

async function withExplore(run) {
  const nodes = new Map();
  const pending = [];
  const revoked = [];
  const painted = [];
  let failPreview = false;
  let urlNumber = 0;
  const node = id => {
    if (!nodes.has(id)) {
      const listeners = {};
      nodes.set(id, {
        id, value: id === 'resolution' ? '2' : '0', disabled: id === 'photo-option',
        checked: false, hidden: false, textContent: '', dataset: {}, width: 640, height: 480,
        files: [], classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {},
        addEventListener(type, handler) { listeners[type] = handler; },
        fire(type, extra = {}) { listeners[type]?.({ target: this, preventDefault() {}, ...extra }); },
        querySelectorAll() { return []; },
        querySelector(selector) { return selector === 'option[value="photo"]' ? node('photo-option') : null; },
        getContext() {
          return {
            clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
            drawImage(image) {
              if (id === 'preview' && failPreview) { failPreview = false; throw Error('render failed'); }
              painted.push({ id, image });
            },
          };
        },
      });
    }
    return nodes.get(id);
  };
  const previous = { document: globalThis.document, Image: globalThis.Image, URL: globalThis.URL, window: globalThis.window };
  globalThis.document = {
    querySelector: selector => node(selector.slice(1)),
    createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage(image) { painted.push({ id: 'offscreen', image }); } }) }),
  };
  globalThis.window = { scrollTo() {} };
  globalThis.URL = {
    createObjectURL: () => `blob:${++urlNumber}`,
    revokeObjectURL: url => revoked.push(url),
  };
  globalThis.Image = class {
    set src(value) {
      if (value.startsWith('data:')) { this.complete = true; this.naturalWidth = 320; this.naturalHeight = 240; }
      else pending.push(this);
    }
    fire(width = 800, height = 600) {
      this.naturalWidth = width; this.naturalHeight = height;
      this.onload();
    }
  };
  try {
    await import(`../src/app.js?rollback=${Math.random()}`);
    const upload = (width, height) => {
      node('photo-input').files = [{ type: 'image/png', size: 10 }];
      node('photo-input').fire('change');
      pending.at(-1).fire(width, height);
    };
    await run({ node, upload, painted, revoked, failNextPreview: () => { failPreview = true; } });
  } finally {
    Object.assign(globalThis, previous);
  }
}

test('sample resolution survives full-resolution photo defaults, replacement and mode changes until a shared step is chosen', async () => {
  await withExplore(({ node, upload }) => {
    assert.equal(node('preview-size').textContent, '32 × 24 px');
    upload(800, 600);
    assert.equal(node('preview-size').textContent, '800 × 600 px');
    assert.equal(node('resolution').value, node('resolution').max);
    node('challenge-tab').fire('click'); node('explore-tab').fire('click');
    upload(1, 1600);
    assert.equal(node('preview-size').textContent, '1 × 1600 px');
    node('image-select').value = '1'; node('image-select').fire('change');
    assert.equal(node('resolution').value, '2');
    assert.equal(node('preview-size').textContent, '32 × 24 px');
    node('resolution').value = '3'; node('resolution').fire('input');
    upload(1600, 1);
    assert.equal(node('preview-size').textContent, '1600 × 1 px');
    node('resolution').value = '1'; node('resolution').fire('input');
    assert.equal(node('preview-size').textContent, '16 × 1 px');
    node('image-select').value = '2'; node('image-select').fire('change');
    assert.equal(node('resolution').value, '1');
    assert.equal(node('preview-size').textContent, '16 × 12 px');
  });
});

test('failed first photo render restores sample selection and disabled photo option, then recovers', async () => {
  await withExplore(({ node, upload, revoked, failNextPreview }) => {
    node('image-select').value = '1'; node('image-select').fire('change');
    const before = node('preview-size').textContent;
    const beforeStep = node('resolution').value;
    failNextPreview();
    upload(1200, 1600);
    assert.equal(node('image-select').value, '1');
    assert.equal(node('photo-option').disabled, true);
    assert.equal(node('source-size').textContent, 'Sample illustration: 320 × 240 px');
    assert.equal(node('preview-size').textContent, before);
    assert.equal(node('resolution').value, beforeStep);
    assert.equal(node('resolution').max, '4');
    assert.equal(node('photo-error').textContent, readError);
    assert.deepEqual(revoked, ['blob:1']);
    node('image-select').value = '0'; node('image-select').fire('change');
    assert.equal(node('photo-error').textContent, '');
    assert.equal(node('source-size').textContent, 'Sample illustration: 320 × 240 px');
    upload(800, 600);
    assert.equal(node('image-select').value, 'photo');
    assert.equal(node('photo-option').disabled, false);
    assert.equal(node('source-size').textContent, 'Working image: 800 × 600 px (original file unchanged)');
    assert.equal(node('preview-size').textContent, '800 × 600 px');
    assert.equal(node('photo-error').textContent, '');
    node('image-select').value = '1'; node('image-select').fire('change');
    assert.equal(node('preview-size').textContent, before);
    assert.equal(node('resolution').value, beforeStep);
  });
});

test('failed replacement render retains prior photo and enabled option, then recovers', async () => {
  await withExplore(({ node, upload, painted, revoked, failNextPreview }) => {
    upload(800, 600);
    const priorImage = painted.filter(call => call.id === 'offscreen').at(-1).image;
    const priorSize = node('source-size').textContent;
    node('resolution').value = '2'; node('resolution').fire('input');
    const priorPreview = node('preview-size').textContent;
    assert.equal(node('photo-option').disabled, false);
    failNextPreview();
    upload(1200, 1600);
    assert.equal(node('image-select').value, 'photo');
    assert.equal(node('photo-option').disabled, false);
    assert.equal(node('source-size').textContent, priorSize);
    assert.equal(node('preview-size').textContent, priorPreview);
    assert.equal(node('resolution').value, '2');
    assert.equal(node('resolution').max, '5');
    assert.equal(painted.filter(call => call.id === 'offscreen').at(-1).image, priorImage);
    assert.equal(node('photo-error').textContent, readError);
    assert.deepEqual(revoked, ['blob:1', 'blob:2']);
    node('resolution').value = '3'; node('resolution').fire('input');
    assert.equal(node('preview-size').textContent, '64 × 48 px');
    assert.equal(painted.filter(call => call.id === 'offscreen').at(-1).image, priorImage);
    upload(600, 800);
    assert.equal(node('source-size').textContent, 'Working image: 600 × 800 px (original file unchanged)');
    assert.equal(node('preview-size').textContent, '600 × 800 px');
    assert.equal(node('image-select').value, 'photo');
    assert.equal(node('photo-option').disabled, false);
    assert.equal(node('photo-error').textContent, '');
    node('image-select').value = '1'; node('image-select').fire('change');
    assert.equal(node('preview-size').textContent, '64 × 48 px');
    assert.equal(node('resolution').value, '3');
  });
});
