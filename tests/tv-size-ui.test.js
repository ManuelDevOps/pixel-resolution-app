import test from 'node:test';
import assert from 'node:assert/strict';
import { initTvLab } from '../src/tv-lab.js';

function createHarness() {
  const nodes = new Map();
  const pending = [];
  const revoked = [];
  let nextUrl = 0;

  function canvas(id = '') {
    const draws = [];
    const transforms = [];
    return {
      id, width: 640, height: 360, draws, transforms, style: {},
      getContext() {
        return {
          save() {}, restore() {}, scale() {}, fillRect() {}, clearRect() {},
          beginPath() {}, arc() {}, fill() {}, moveTo() {}, lineTo() {},
          quadraticCurveTo() {}, stroke() {}, strokeRect() {}, fillText() {},
          setTransform(...args) { transforms.push(args); },
          drawImage(...args) { draws.push(args); },
        };
      },
    };
  }

  function node(selector) {
    if (!nodes.has(selector)) {
      const listeners = {};
      const element = {
        hidden: selector === '#tv-closeups' || selector === '#tv-zoom-note',
        textContent: '', value: '', files: [], attributes: {},
        classList: { add() {}, remove() {} },
        addEventListener(type, callback) { listeners[type] = callback; },
        setAttribute(key, value) { this.attributes[key] = value; },
        fire(type, extra = {}) {
          listeners[type]?.({ target: this, currentTarget: this, preventDefault() {}, ...extra });
        },
      };
      nodes.set(selector, selector.startsWith('[data-tv-') ? canvas(selector) : element);
    }
    return nodes.get(selector);
  }

  const root = {
    innerHTML: '',
    querySelector: node,
    querySelectorAll() { return []; },
  };
  const previous = { document: globalThis.document, Image: globalThis.Image, URL: globalThis.URL };
  globalThis.document = { createElement: () => canvas('offscreen') };
  globalThis.URL = {
    createObjectURL: () => `blob:${++nextUrl}`,
    revokeObjectURL: url => revoked.push(url),
  };
  globalThis.Image = class {
    set src(value) { this.url = value; pending.push(this); }
    fire(type, width = 4000, height = 3000) {
      this.naturalWidth = width;
      this.naturalHeight = height;
      this[`on${type}`]?.();
    }
  };

  return { root, node, pending, revoked, restore: () => Object.assign(globalThis, previous) };
}

function screen(node, diagonal) {
  return node(`[data-tv-size="${diagonal}"]`);
}

function lastImage(canvas) {
  return canvas.draws.at(-1)[0];
}

test('TV Lab uploads once, shares the image, simulates HD and preserves it on rejection', () => {
  const { root, node, pending, revoked, restore } = createHarness();
  try {
    initTvLab(root);
    assert.match(root.innerHTML, /Drag and drop the image here/);
    assert.match(root.innerHTML, /32″ TV/);
    assert.match(root.innerHTML, /45″ TV/);
    assert.match(root.innerHTML, /70″ TV/);
    const initial = [32, 45, 70].map(size => lastImage(screen(node, size)));
    assert.ok(initial.every(image => image === initial[0]));
    assert.equal(screen(node, 70).style.filter, 'none');
    assert.doesNotMatch(root.innerHTML, /The extra blur on larger screens is exaggerated for teaching/);

    node('#tv-photo-input').files = [{ type: 'image/png', size: 10 }];
    node('#tv-photo-input').fire('change');
    pending[0].fire('load', 4000, 3000);
    assert.match(node('#tv-image-info').textContent, /3,840 × 2,880 px \(resized for TV Lab\)/);
    const original = [32, 45, 70].map(size => lastImage(screen(node, size)));
    assert.ok(original.every(image => image === original[0]));
    assert.deepEqual([original[0].width, original[0].height], [3840, 2880]);
    assert.deepEqual(revoked, ['blob:1']);

    node('#tv-hd').fire('click');
    assert.equal(node('#tv-hd').attributes['aria-pressed'], 'true');
    assert.match(node('#tv-image-info').textContent, /960 × 720 px of image detail/);
    const hd = [32, 45, 70].map(size => lastImage(screen(node, size)));
    assert.ok(hd.every(image => image === hd[0]));
    assert.deepEqual([hd[0].width, hd[0].height], [960, 720]);
    assert.equal(screen(node, 32).style.filter, 'none');
    assert.equal(screen(node, 45).style.filter, 'blur(1px)');
    assert.equal(screen(node, 70).style.filter, 'blur(2.25px)');
    node('#tv-original').fire('click');
    assert.equal(node('#tv-original').attributes['aria-pressed'], 'true');
    assert.equal(screen(node, 70).style.filter, 'none');
    assert.ok([32, 45, 70].every(size => lastImage(screen(node, size)) === original[0]));
    node('#tv-hd').fire('click');

    node('#tv-look-closer').fire('click');
    assert.equal(node('#tv-closeups').hidden, false);
    assert.equal(node('#tv-look-closer').attributes['aria-pressed'], 'true');
    const zooms = [32, 45, 70].map(size => node(`[data-tv-zoom="${size}"]`));
    assert.ok(zooms.every(view => lastImage(view) === hd[0]));
    assert.ok(zooms[0].transforms.at(-1)[0] < zooms[1].transforms.at(-1)[0]);
    assert.ok(zooms[1].transforms.at(-1)[0] < zooms[2].transforms.at(-1)[0]);
    node('#tv-look-closer').fire('click');
    assert.equal(node('#tv-closeups').hidden, true);
    assert.equal(node('#tv-look-closer').attributes['aria-pressed'], 'false');

    const before = node('#tv-image-info').textContent;
    node('#tv-drop-zone').fire('drop', { dataTransfer: { files: [{ type: 'image/gif', size: 10 }] } });
    assert.equal(node('#tv-photo-error').textContent, 'Choose a JPEG, PNG or WebP image.');
    assert.equal(node('#tv-image-info').textContent, before);
    assert.equal(lastImage(screen(node, 32)), hd[0]);

    node('#tv-drop-zone').fire('drop', { dataTransfer: { files: [{ type: 'image/jpeg', size: 10 }] } });
    pending[1].fire('load', 500, 1000);
    assert.match(node('#tv-image-info').textContent, /500 × 1,000 px/);
    assert.match(node('#tv-image-info').textContent, /360 × 720 px of image detail/);
    node('#tv-original').fire('click');
    assert.equal(screen(node, 70).style.filter, 'blur(2.25px)');
    assert.deepEqual(revoked, ['blob:1', 'blob:2']);
  } finally {
    restore();
  }
});

test('TV Lab keeps the latest photo and recovers after unreadable images', () => {
  const { root, node, pending, revoked, restore } = createHarness();
  try {
    initTvLab(root);
    const input = node('#tv-photo-input');
    input.files = [{ type: 'image/png', size: 10 }]; input.fire('change');
    input.files = [{ type: 'image/png', size: 10 }]; input.fire('change');
    pending[1].fire('load', 800, 600);
    pending[0].fire('load', 4000, 3000);
    assert.match(node('#tv-image-info').textContent, /800 × 600 px/);
    const image = lastImage(screen(node, 32));
    input.files = [{ type: 'image/png', size: 10 }]; input.fire('change');
    pending[2].fire('error');
    assert.match(node('#tv-photo-error').textContent, /Could not read/);
    assert.equal(lastImage(screen(node, 32)), image);
    assert.deepEqual(revoked, ['blob:1', 'blob:2', 'blob:3']);
  } finally {
    restore();
  }
});
