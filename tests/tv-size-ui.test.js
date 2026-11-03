import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initTvLab, screenSizeCm } from '../src/tv-lab.js';

const tvCss = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

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
      parentElement: { getBoundingClientRect: () => ({ left: 0, width: 700 }) },
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
        hidden: false,
        textContent: '', value: '', files: [], attributes: {}, style: {},
        dataset: { tvAnswer: /^\[data-tv-answer="([^"]+)"\]$/.exec(selector)?.[1] },
        setPointerCapture() {},
        getBoundingClientRect() { return { left: 689, width: 22 }; },
        classList: { add() {}, remove() {} },
        addEventListener(type, callback) { listeners[type] = callback; },
        setAttribute(key, value) { this.attributes[key] = value; },
        fire(type, extra = {}) {
          listeners[type]?.({ target: this, currentTarget: this, preventDefault() {}, ...extra });
        },
      };
      nodes.set(selector, /^\[data-tv-(size|zoom)=/.test(selector) ? canvas(selector) : element);
    }
    return nodes.get(selector);
  }

  const root = {
    innerHTML: '',
    querySelector: node,
    querySelectorAll(selector) { return selector === '[data-tv-answer]' ? ['loses-pixels', 'same-pixels', 'gains-detail'].map(answer => node(`[data-tv-answer="${answer}"]`)) : []; },
  };
  const previous = { document: globalThis.document, Image: globalThis.Image, URL: globalThis.URL };
  globalThis.document = { createElement: () => canvas('offscreen') };
  globalThis.URL = {
    createObjectURL: () => `blob:${++nextUrl}`,
    revokeObjectURL: url => revoked.push(url),
  };
  globalThis.Image = class {
    set src(value) { this.url = value; if (value === '/assets/landscape-720p.png') this.onerror(); else pending.push(this); }
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

test('real TV photo frames keep each canvas and handle inside the actual 16:9 display', () => {
  const { root, restore } = createHarness();
  try {
    initTvLab(root);
    assert.equal((root.innerHTML.match(/class="tv-photo-frame"/g) || []).length, 3);
    assert.equal((root.innerHTML.match(/class="tv-size-bezel"/g) || []).length, 3);
    for (const size of [32, 45, 70]) {
      assert.match(root.innerHTML, new RegExp(`class="tv-photo-frame"><div class="tv-size-bezel"><canvas[^>]+data-tv-size="${size}"`));
    }
    assert.match(root.innerHTML, /data-tv-size="70"[^<]*<\/canvas><div class="tv-stretch-handle" data-tv-handle="70"/);
    assert.match(tvCss, /\.tv-photo-frame\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/s);
    assert.match(tvCss, /\.tv-size-bezel\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/s);
    assert.match(tvCss, /tv-photo\.png/);
  } finally { restore(); }
});

test('TV Lab uploads once, shares the image, simulates HD and preserves it on rejection', () => {
  const { root, node, pending, revoked, restore } = createHarness();
  try {
    initTvLab(root);
    assert.match(root.innerHTML, /Drag and drop the image here/);
    for (const size of [32, 45, 70]) assert.match(root.innerHTML, new RegExp(`<strong class="tv-inches">${size}″</strong> <span>TV</span>`));
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

    assert.match(node('#tv-image-info').textContent, /Automatic 4K/);
    assert.doesNotMatch(root.innerHTML, /id="tv-hd"/);
    const hd = [32, 45, 70].map(size => lastImage(screen(node, size)));
    assert.ok(hd.every(image => image === original[0]));
    assert.equal(screen(node, 32).style.filter, 'none');
    assert.equal(screen(node, 45).style.filter, 'none');
    assert.equal(screen(node, 70).style.filter, 'none');
    node('[data-tv-stretch="45"]').value = '100';
    node('[data-tv-stretch="45"]').fire('input');
    node('[data-tv-stretch="70"]').value = '100';
    node('[data-tv-stretch="70"]').fire('input');
    assert.equal(screen(node, 45).style.filter, 'none');
    assert.equal(screen(node, 70).style.filter, 'none');
    assert.ok([32, 45, 70].every(size => lastImage(screen(node, size)) === original[0]));

    assert.ok([32, 45, 70].every(size => lastImage(screen(node, size)) === hd[0]));

    const before = node('#tv-image-info').textContent;
    node('#tv-drop-zone').fire('drop', { dataTransfer: { files: [{ type: 'image/gif', size: 10 }] } });
    assert.equal(node('#tv-photo-error').textContent, 'Choose a JPEG, PNG or WebP image.');
    assert.equal(node('#tv-image-info').textContent, before);
    assert.equal(lastImage(screen(node, 32)), hd[0]);
    assert.equal(node('[data-tv-stretch="70"]').value, '100');
    assert.equal(screen(node, 70).style.filter, 'none');

    node('#tv-drop-zone').fire('drop', { dataTransfer: { files: [{ type: 'image/jpeg', size: 10 }] } });
    pending[1].fire('load', 500, 1000);
    assert.equal(node('[data-tv-stretch="45"]').value, '0');
    assert.equal(node('[data-tv-stretch="70"]').value, '0');
    assert.equal(screen(node, 70).style.filter, 'none');
    assert.match(node('#tv-image-info').textContent, /500 × 1,000 px/);
    assert.match(node('#tv-image-info').textContent, /360 × 720 px of image detail/);
    assert.equal(screen(node, 70).style.filter, 'none');
    assert.deepEqual(revoked, ['blob:1', 'blob:2']);
  } finally {
    restore();
  }
});

test('TV Lab omits the Look closer control and its close-up views but keeps the simulation note', () => {
  const { root, restore } = createHarness();
  try {
    initTvLab(root);
    assert.doesNotMatch(root.innerHTML, /tv-look-closer|tv-closeups|tv-zoom-note|data-tv-zoom|Look closer|close-ups/i);
    assert.match(root.innerHTML, /The TVs are shown in proportion\. They are simulations, not actual physical sizes\./);
  } finally { restore(); }
});

test('screen size in whole centimetres follows the 16:9 diagonal', () => {
  assert.deepEqual(screenSizeCm(32), { width: 71, height: 40 });
  assert.deepEqual(screenSizeCm(45), { width: 100, height: 56 });
  assert.deepEqual(screenSizeCm(70), { width: 155, height: 87 });
});

test('TV Lab starts at equal image size and stretches each TV independently', () => {
  const { root, node, restore } = createHarness();
  try {
    initTvLab(root);
    // The removed instruction note is replaced by each larger TV's labelled stretch slider.
    assert.doesNotMatch(root.innerHTML, /purple resize dot/);
    for (const size of [45, 70]) assert.match(root.innerHTML, new RegExp(`<label class="tv-stretch-label">Stretch image on ${size}-inch TV`));
    assert.doesNotMatch(root.innerHTML, /Drag the image corner/);
    // Each TV shows its inches, its 16:9 screen size in centimetres beside them, and its resolution.
    // The resolution is followed, at the same size, by px and the total pixel count.
    for (const [size, cm, resolution] of [[32, '71 × 40 cm', '1280 × 720 px \\(921,600 pixels\\)'], [45, '100 × 56 cm', '1920 × 1080 px \\(2,073,600 pixels\\)'], [70, '155 × 87 cm', '3840 × 2160 px \\(8,294,400 pixels\\)']]) {
      // Non-breaking spaces keep each group together; the line may only wrap before the bracket.
      assert.match(root.innerHTML, /\d\u00a0×\u00a0\d+\u00a0px \(\d[\d,]*\u00a0pixels\)/);
      assert.match(root.innerHTML.replaceAll('\u00a0', ' '), new RegExp(`<figcaption><strong class="tv-inches">${size}″</strong> <span>TV</span> <span class="tv-cm">${cm}</span><small class="tv-resolution">${resolution}</small></figcaption>`));
    }
    // The inches are 50% larger than the 14px caption text.
    assert.match(tvCss, /\.tv-size-screen figcaption \.tv-inches \{[^}]*font-size: 21px/);
    assert.match(root.innerHTML, /tv-stretch-spacer/);
    assert.match(root.innerHTML, /stretched to fill the 70/);
    assert.match(tvCss, /tv-stretch-spacer[^}]*height:\s*56px/s);
    assert.match(tvCss, /max-width:\s*750px[^}]*tv-stretch-spacer[^}]*display:\s*none/s);
    assert.match(root.innerHTML, /Stretch image on 45-inch TV/);
    assert.match(root.innerHTML, /Stretch image on 70-inch TV/);
    const widths = [32, 45, 70].map(size => screen(node, size).transforms.at(-1)[0]);
    assert.ok(widths[0] > widths[1] && widths[1] > widths[2]);
    for (const size of [45, 70]) {
      assert.ok(Math.abs(widths[0] * 32 - screen(node, size).transforms.at(-1)[0] * size) < 1e-10);
    }
    assert.equal(screen(node, 70).style.filter, 'none');
    const range = node('[data-tv-stretch="70"]');
    range.value = '50'; range.fire('input');
    assert.ok(screen(node, 70).transforms.at(-1)[0] > widths[2]);
    assert.equal(screen(node, 45).transforms.at(-1)[0], widths[1]);
    assert.equal(screen(node, 45).style.filter, 'none');
    assert.equal(screen(node, 70).style.filter, 'none');
    range.value = '100'; range.fire('input');
    assert.equal(screen(node, 70).transforms.at(-1)[0], widths[0]);
    assert.equal(screen(node, 70).style.filter, 'none');
    range.value = '0'; range.fire('input');
    assert.equal(screen(node, 70).transforms.at(-1)[0], widths[2]);
    const handle = node('[data-tv-handle="70"]');
    handle.fire('pointerdown', { pointerId: 1, clientX: 690 });
    handle.fire('pointermove', { clientX: 690, pointerId: 1 });
    assert.equal(range.value, '0', 'grabbing off-centre does not jump');
    handle.fire('pointermove', { clientX: 1040, pointerId: 1 });
    assert.equal(range.value, '100');
    handle.fire('lostpointercapture', { pointerId: 1 });
    handle.fire('pointermove', { clientX: 690, pointerId: 1 });
    assert.equal(range.value, '100', 'lost capture ends the drag');
    handle.fire('pointerdown', { pointerId: 2, clientX: 690 });
    handle.fire('pointermove', { clientX: 655, pointerId: 3 });
    assert.equal(range.value, '100', 'other pointers cannot move it');
    handle.fire('pointermove', { clientX: 655, pointerId: 2 });
    assert.ok(Number(range.value) < 100, 'dragging back from the edge works');
    handle.fire('pointercancel', { pointerId: 2 });
    assert.match(handle.style.left, /clamp\(11px,/);
  } finally { restore(); }
});

test('the size quiz describes enlargement, not TV size alone', () => {
  const { root, node, restore } = createHarness();
  try {
    initTvLab(root);
    assert.match(root.innerHTML, /stretched to fill the 70/);
    node('[data-tv-answer="same-pixels"]').fire('click', { target: { dataset: { tvAnswer: 'same-pixels' } } });
    assert.match(node('#tv-feedback').textContent, /stretched/i);
    assert.match(node('#tv-feedback').textContent, /same pixels cover more space/i);
  } finally { restore(); }
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
