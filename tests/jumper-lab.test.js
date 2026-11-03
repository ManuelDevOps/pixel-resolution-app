import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOTIFS, stitchSize, stitchStats, jumperLayout, initJumperLab } from '../src/jumper-lab.js';

function fixture() {
  const nodes = new Map();
  let width = 680;
  const previous = { window: globalThis.window, MutationObserver: globalThis.MutationObserver };
  let observe;
  const trace = [];
  let clips = 0;
  const stack = [];
  const context = {
    clearRect() {}, setTransform() {}, translate() {}, scale() {}, beginPath() {}, moveTo() {}, lineTo() {},
    fillRect(x, y, w, h) { trace.push({ action: 'cell', colour: this.fillStyle, x, y, w, h, clips }); },
    save() { stack.push(clips); }, restore() { clips = stack.pop(); },
    clip() { clips++; trace.push({ action: 'clip' }); },
    stroke() { trace.push({ action: 'stroke', clips }); },
    fill() { trace.push({ action: 'fill', colour: this.fillStyle, clips }); },
    quadraticCurveTo() {}, bezierCurveTo() {}, ellipse() {}, arc() {}, closePath() {},
  };
  const node = selector => {
    if (!nodes.has(selector)) {
      const listeners = {};
      nodes.set(selector, {
        value: selector === '#jumper-motif' ? 'heart' : '100', textContent: '', attributes: {},
        width: 640, height: 480, style: {}, scrollLeft: 0, parentElement: { getBoundingClientRect: () => ({ width }) },
        setAttribute(key, value) { this.attributes[key] = value; },
        addEventListener(key, handler) { listeners[key] = handler; },
        fire(key) { listeners[key]?.({ target: this }); },
        getContext() { return context; },
      });
    }
    return nodes.get(selector);
  };
  const root = { innerHTML: '', hidden: false, querySelector: node };
  globalThis.window = { devicePixelRatio: 2, addEventListener() {} };
  globalThis.MutationObserver = class { constructor(callback) { observe = callback; } observe() {} };
  return { root, node, trace, resize(value) { width = value; observe(); }, close() { Object.assign(globalThis, previous); } };
}

test('each picture is a 32 × 32 grid; heart and star have finer-than-doubled edges', () => {
  for (const [name, grid] of Object.entries({ heart: MOTIFS.heart, star: MOTIFS.star, invader: MOTIFS.invader })) {
    assert.equal(grid.length, 32);
    assert.ok(grid.every(row => row.length === 32 && /^[01]+$/.test(row)));
    assert.ok(grid.join('').includes('1'), `${name} is visible`);
  }
  for (const name of ['heart', 'star']) {
    const grid = MOTIFS[name];
    assert.ok(Array.from({ length: 16 }, (_, row) => Array.from({ length: 16 }, (_, col) =>
      new Set([grid[row * 2][col * 2], grid[row * 2][col * 2 + 1],
        grid[row * 2 + 1][col * 2], grid[row * 2 + 1][col * 2 + 1]]).size > 1
    ).some(Boolean)).some(Boolean), `${name} has sub-pixel detail beyond a doubled 16 × 16 image`);
  }
});

test('picture selector keeps the originals and appends two detailed multicolour pictures', () => {
  const h = fixture();
  try {
    initJumperLab(h.root);
    assert.deepEqual(Array.from(h.root.innerHTML.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g),
      ([, value, label]) => [value, label]), [
      ['heart', 'Heart'], ['star', 'Star'], ['invader', 'Space invader'],
      ['landscape', 'Sunset landscape'], ['parrot', 'Parrot'],
    ]);
  } finally { h.close(); }
});

test('detailed pictures contain 40 × 40 palette-key stitches in multiple colours', () => {
  for (const [name, minimum] of [['landscape', 8], ['parrot', 7]]) {
    const { palette, rows } = MOTIFS[name];
    assert.equal(rows.length, 40, name);
    assert.ok(rows.every(row => row.length === 40), name);
    assert.ok(Object.values(palette).every(colour => /^#[0-9a-f]{6}$/i.test(colour)));
    const used = new Set(rows.join(''));
    assert.ok([...used].every(key => Object.hasOwn(palette, key)), name);
    assert.ok(used.size >= minimum, name);
  }
});

test('sunset landscape separates light sky, dark snowy mountains, blue lake and foreground pines', () => {
  const { palette, rows } = MOTIFS.landscape;
  const luminance = key => {
    const channels = palette[key].match(/[0-9a-f]{2}/gi).map(hex => parseInt(hex, 16) / 255);
    return channels.map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
      .reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
  };
  const average = keys => keys.reduce((sum, key) => sum + luminance(key), 0) / keys.length;
  const sky = Array.from(rows.slice(0, 10).join('')).filter(key => 'abcde'.includes(key));
  const mountain = Array.from(rows.join('')).filter(key => 'hij'.includes(key));
  const lake = Array.from(rows.slice(30, 36).join('')).filter(key => 'lm'.includes(key));
  assert.ok(sky.length > 250 && mountain.length > 120 && lake.length > 100);
  assert.ok(average(sky) - average(mountain) >= .35, 'sky must be clearly brighter than mountains');
  assert.ok(average(lake) - average(mountain) >= .12, 'lake must be brighter than mountains');
  assert.ok(average(sky) - average(lake) >= .12, 'lake must remain darker than sky');
  assert.ok(Array.from(rows.slice(12, 28)).some((row, offset) =>
    Array.from(row).some((key, x) => key === 'k' && 'hi'.includes(rows[offset + 13][x]))),
  'white snow touches a mountain slope');
  assert.ok(luminance('k') > .75, 'snow is bright white');
  assert.ok(rows.slice(30, 37).filter(row => row.slice(21, 30).includes('n')).length >= 3,
    'broken sun reflection continues down the lake below the sun');
  assert.ok(luminance('n') - average(lake) >= .3, 'sun reflection stands out on water');
  assert.ok(rows[39].slice(10, 30).includes('p'), 'green shore reaches the bottom');
  assert.ok([5, 36].every(x => rows.slice(25, 35).some(row => 'op'.includes(row[x]))),
    'pines frame both edges of the water');
});

test('each detailed cell is drawn once at its palette colour, centred on the body grid', () => {
  const h = fixture();
  try {
    initJumperLab(h.root);
    for (const name of ['landscape', 'parrot']) {
      h.trace.length = 0;
      h.node('#jumper-motif').value = name;
      h.node('#jumper-motif').fire('change');
      const { palette, rows } = MOTIFS[name];
      const body = h.trace.filter(item => item.action === 'cell' && item.clips > 0).slice(-48 * 68);
      assert.equal(body.length, 48 * 68);
      for (let row = 0; row < 40; row++) for (let col = 0; col < 40; col++) {
        const cell = body[(row + 12) * 48 + col + 4];
        assert.equal(cell.colour, palette[rows[row][col]], `${name} at ${col},${row}`);
        assert.equal(cell.x, 192 + (col + 4) * 4.5 + .3);
        assert.equal(cell.y, 101 + (row + 12) * 4.5 + .3);
        assert.equal(cell.w, 3.9);
        assert.equal(cell.h, 3.9);
      }
      for (const [key, colour] of Object.entries(palette)) {
        assert.equal(body.filter(cell => cell.colour === colour).length,
          rows.join('').split(key).length - 1, `${name} ${key} count`);
      }
      assert.equal(h.node('#jumper-count').textContent, 'Stitches in the picture: 40 × 40 = 1,600 (unchanged)');
      assert.equal(h.node('#jumper-canvas').attributes['aria-label'].split(' knitted picture')[0],
        name === 'landscape' ? 'Sunset landscape' : 'Parrot');
      h.node('#jumper-x').value = '400'; h.node('#jumper-x').fire('input');
      h.node('#jumper-y').value = '400'; h.node('#jumper-y').fire('input');
      assert.equal(h.node('#jumper-count').textContent, 'Stitches in the picture: 40 × 40 = 1,600 (unchanged)');
      assert.equal(h.node('#jumper-canvas').attributes['aria-label'],
        `${name === 'landscape' ? 'Sunset landscape' : 'Parrot'} knitted picture, 400% sideways and 400% lengthways stretch`);
    }
  } finally { h.close(); }
});

test('stretch changes stitch proportions but never the 1,024 picture stitches', () => {
  assert.deepEqual(stitchSize(8, 200, 100), { width: 16, height: 8 });
  const count = 'Stitches in the picture: 32 × 32 = 1,024 (unchanged)';
  assert.equal(stitchStats(100, 100).count, count);
  assert.equal(stitchStats(400, 400).count, count);
  assert.equal(stitchStats(200, 100).size, 'Each stitch is now 2.0× wider and 1.0× taller');
});

test('base stitches are large and the 400% canvas grows with both axes independently', () => {
  for (const width of [720, 250]) {
    const height = width * 3 / 4;
    const start = jumperLayout(width, height, 100, 100);
    const wide = jumperLayout(width, height, 400, 100);
    const tall = jumperLayout(width, height, 100, 400);
    const full = jumperLayout(width, height, 400, 400);
    assert.ok(start.outlineWidth >= width * .69 && start.outlineWidth <= width * .71);
    assert.ok(4.5 * start.scale > 0);
    assert.equal(start.canvasWidth, width);
    assert.equal(start.canvasHeight, height);
    assert.equal(wide.bodyWidth, 4 * start.bodyWidth);
    assert.equal(wide.bodyHeight, start.bodyHeight);
    assert.equal(wide.outlineHeight, start.outlineHeight);
    assert.equal(tall.bodyWidth, start.bodyWidth);
    assert.equal(tall.bodyHeight, 4 * start.bodyHeight);
    assert.equal(full.scale, start.scale);
    assert.ok(full.canvasWidth > width && full.canvasHeight > height);
    assert.ok(full.canvasWidth > full.outlineWidth && full.canvasHeight > full.outlineHeight);
    assert.ok((full.canvasWidth - full.outlineWidth) / 2 >= width * .14);
    assert.ok((full.canvasHeight - full.outlineHeight) / 2 >= height * .14);
    const originalScale = width * .7 / 456;
    const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);
    near(start.scale, originalScale);
    near(start.bodyWidth, 220 * originalScale);
    near(start.bodyHeight, 305 * originalScale);
    near(start.outlineWidth, 456 * originalScale);
    near(start.outlineHeight, 331 * originalScale);
    assert.equal(start.canvasWidth, width);
    assert.equal(start.canvasHeight, height);
    near(full.canvasWidth, 456 * originalScale * 4 + width * .3);
    near(full.canvasHeight, 331 * originalScale * 4 + height * .3);
  }
});

test('every stitch is a square pixel, clipped to the jumper, with the picture in contrasting yarn', () => {
  const h = fixture();
  try {
    initJumperLab(h.root);
    for (const [name, colour] of [['heart', '#a92747'], ['star', '#f5c648'], ['invader', '#348b52']]) {
      h.trace.length = 0;
      h.node('#jumper-motif').value = name;
      h.node('#jumper-motif').fire('change');
      assert.ok(h.trace.filter(item => item.action === 'clip').length >= 3);
      // No V-shaped stitches: wool and picture are both drawn as square cells.
      assert.equal(h.trace.filter(item => item.action === 'stroke').length, 0);
      const cells = h.trace.filter(item => item.action === 'cell' && item.clips > 0);
      assert.ok(cells.length >= 48 * 68);
      assert.ok(cells.every(item => item.w === item.h && item.w > 0));
      assert.equal(new Set(cells.map(item => item.w)).size, 1, 'one stitch size across the jumper');
      const body = cells.slice(-48 * 68);
      assert.equal(body.length, 48 * 68);
      assert.equal(new Set(body.map(item => item.y)).size, 68);
      assert.equal(new Set(body.map(item => item.x)).size, 48);
      assert.equal(body[0].x + body.at(-1).x + body[0].w, 600, 'body grid stays centred');
      assert.equal(body[1].x - body[0].x, 4.5);
      assert.ok(body[0].w < 4.5 && body[0].w > 3.5, 'fine gaps between cells');
      assert.equal(cells.filter(item => item.colour === colour).length, MOTIFS[name].join('').split('1').length - 1);
    }
  } finally { h.close(); }
});

test('Jumper Lab renders, updates picture and stretch, restores default and retains state while hidden', () => {
  const h = fixture();
  try {
    initJumperLab(h.root);
    assert.match(h.root.innerHTML, /id="jumper-nav" class="mode-nav-row"/);
    assert.match(h.root.innerHTML, /class="hero".*id="jumper-title"/s);
    assert.match(h.root.innerHTML, /01 \/ STRETCH IT.*Stretch the jumper/s);
    assert.equal((h.root.innerHTML.match(/min="100" max="400" step="5" value="100"/g) || []).length, 2);
    assert.equal(h.node('#jumper-canvas').attributes['aria-label'], 'Heart knitted picture, 100% sideways and 100% lengthways stretch');
    h.node('#jumper-motif').value = 'star'; h.node('#jumper-motif').fire('change');
    h.node('#jumper-x').value = '400'; h.node('#jumper-x').fire('input');
    assert.ok(Number.parseFloat(h.node('#jumper-canvas').style.width) > 680);
    assert.ok(h.node('#jumper-canvas').parentElement.scrollLeft > 0);
    h.node('#jumper-y').value = '400'; h.node('#jumper-y').fire('input');
    assert.ok(Number.parseFloat(h.node('#jumper-canvas').style.height) > 510);
    assert.equal(h.node('#jumper-size').textContent, 'Each stitch is now 4.0× wider and 4.0× taller');
    assert.equal(h.node('#jumper-count').textContent, 'Stitches in the picture: 32 × 32 = 1,024 (unchanged)');
    h.root.hidden = true; h.root.hidden = false; h.resize(320);
    assert.ok(h.node('#jumper-canvas').width <= 4096);
    assert.ok(h.node('#jumper-canvas').height <= 4096);
    assert.equal(h.node('#jumper-motif').value, 'star');
    assert.equal(h.node('#jumper-x').value, '400');
    assert.equal(h.node('#jumper-y').value, '400');
    assert.match(h.node('#jumper-canvas').attributes['aria-label'], /Star knitted picture, 400% sideways and 400% lengthways/);
    h.node('#jumper-reset').fire('click');
    assert.equal(h.node('#jumper-x').value, '100');
    assert.equal(h.node('#jumper-y').value, '100');
    assert.equal(h.node('#jumper-size').textContent, 'Each stitch is now 1.0× wider and 1.0× taller');
    assert.equal(h.node('#jumper-count').textContent, 'Stitches in the picture: 32 × 32 = 1,024 (unchanged)');
    assert.equal(h.node('#jumper-canvas').parentElement.scrollLeft, 0);
  } finally { h.close(); }
});

test('high-density 400% canvas caps both backing dimensions without reducing CSS size', () => {
  const h = fixture();
  try {
    globalThis.window.devicePixelRatio = 4;
    initJumperLab(h.root);
    h.node('#jumper-x').value = '400'; h.node('#jumper-x').fire('input');
    h.node('#jumper-y').value = '400'; h.node('#jumper-y').fire('input');
    const canvas = h.node('#jumper-canvas');
    assert.ok(canvas.width <= 4096 && canvas.height <= 4096);
    assert.ok(Number.parseFloat(canvas.style.width) > 680);
    assert.ok(Number.parseFloat(canvas.style.height) > 510);
  } finally { h.close(); }
});

test('Jumper Lab shell and both themes share responsive workspace styles', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(html, /<section id="jumper-lab" aria-labelledby="jumper-title" hidden>/);
  assert.match(css, /:is\(#explore, #tv-lab, #jumper-lab\) \.mode-nav-row/);
  assert.match(css, /html\[data-theme="cyber"\].*jumper/s);
  assert.match(css, /\.jumper-frame\s*\{[^}]*overflow-x:\s*auto/);
  assert.doesNotMatch(css, /\.jumper-frame canvas\s*\{[^}]*width:\s*100%/);
});
