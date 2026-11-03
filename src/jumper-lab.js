// A coloured cell is one stitch, not a resampled image pixel.
const sampleMotif = contains => Array.from({ length: 32 }, (_, row) =>
  Array.from({ length: 32 }, (_, col) => contains((col + .5 - 16) / 16, (16 - row - .5) / 16) ? '1' : '0').join(''));
const starPoints = Array.from({ length: 10 }, (_, i) => {
  const angle = -Math.PI / 2 + i * Math.PI / 5;
  const radius = i % 2 ? .42 : .98;
  return [radius * Math.cos(angle), -radius * Math.sin(angle)];
});
function insideStar(x, y) {
  // Odd-even crossings of the five-point star's outline.
  let inside = false;
  for (let i = 0, j = starPoints.length - 1; i < starPoints.length; j = i++) {
    const [xi, yi] = starPoints[i], [xj, yj] = starPoints[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const invader16 = [
  '0000000000000000', '0011000000001100', '0001100000011000', '0011111111111100',
  '0111111111111110', '0111001111001110', '1111001111001111', '1111111111111111',
  '1101111111111011', '1101111111111011', '1101100000011011', '0000110110110000',
  '0001100000011000', '0011000000001100', '0000000000000000', '0000000000000000',
];
// The landscape is sampled directly onto the same one-stitch-per-cell grid.
function sunsetLandscape() {
  const palette = {
    a: '#f3a5a2', b: '#f8b7a0', c: '#fbc99a', d: '#ffda9c', e: '#ffe7ab',
    f: '#ffda62', g: '#fff9da', h: '#49335d', i: '#302b55', j: '#282743',
    k: '#fff9ed', l: '#3689c6', m: '#60aedb', n: '#fff2a2', o: '#123c32',
    p: '#36724b',
  };
  const rows = Array.from({ length: 40 }, (_, y) => Array.from({ length: 40 }, (_, x) => {
    let key = y < 5 ? 'a' : y < 10 ? 'b' : y < 15 ? 'c' : y < 19 ? 'd' : 'e';
    // The low sun disappears behind the snow-capped silhouette.
    const sun = (x - 25) ** 2 + (y - 15) ** 2;
    if (sun <= 64) key = sun <= 25 ? 'g' : 'f';
    const far = 20 - Math.max(0, 7 - Math.abs(x - 9)) * .8;
    if (y >= far && y < 27) key = y < far + 1.5 ? 'k' : 'h';
    const middle = 23 - Math.max(0, 9 - Math.abs(x - 29)) * .85;
    if (y >= middle && y < 28) key = y < middle + 1.5 ? 'k' : 'i';
    const near = 27 - Math.max(0, 5 - Math.abs(x - 2)) * .8;
    if (y >= near && y < 29) key = 'j';
    if (y >= 29) {
      key = y % 4 === 0 ? 'm' : 'l';
      if (y <= 36 && y % 2 === 0 && Math.abs(x - 25) <= Math.max(1, 5 - Math.floor((y - 30) / 2))) key = 'n';
    }
    if (y >= 37) key = 'p';
    // Dark pine silhouettes sit on the shore and frame the light sky and lake.
    for (const [trunk, tip] of [[5, 19], [36, 21]]) {
      if (x === trunk && y >= tip && y <= 39) key = 'o';
      if (y >= tip && y <= 36 && Math.abs(x - trunk) <= Math.floor((y - tip) / 3)) key = 'o';
    }
    return key;
  }).join(''));
  return { palette, rows };
}

// Parrot silhouette is hand-plotted as row spans; each span paints individual stitches.
function parrotPicture() {
  const palette = {
    s: '#c9e7df', r: '#d94942', d: '#a92e42', y: '#f7c747',
    b: '#3276b3', u: '#214e8d', g: '#388c62', w: '#fff2d9',
    k: '#253342', t: '#76533e', v: '#b48a59', o: '#f28c46',
  };
  const pixels = Array.from({ length: 40 }, () => Array(40).fill('s'));
  const spans = (colour, lines) => {
    for (const [row, left, right] of lines) {
      for (let col = left; col <= right; col++) pixels[row][col] = colour;
    }
  };
  spans('k', [
    [3, 15, 23], [4, 12, 26], [5, 10, 28], [6, 9, 29], [7, 8, 29], [8, 8, 30],
    [9, 7, 30], [10, 7, 29], [11, 8, 28], [12, 8, 27], [13, 9, 27],
    [14, 10, 28], [15, 11, 29], [16, 11, 30], [17, 11, 31], [18, 12, 31],
    [19, 12, 32], [20, 13, 32], [21, 13, 32], [22, 14, 32], [23, 14, 31],
    [24, 15, 31], [25, 15, 30], [26, 16, 29], [27, 17, 28], [28, 17, 27],
    [29, 18, 26], [30, 19, 25],
  ]);
  spans('r', [
    [4, 15, 22], [5, 12, 25], [6, 11, 27], [7, 10, 27], [8, 10, 27],
    [9, 9, 26], [10, 9, 25], [11, 10, 25], [12, 10, 25], [13, 11, 26],
    [14, 12, 26], [15, 13, 27], [16, 13, 28], [17, 13, 29], [18, 14, 29],
    [19, 14, 30], [20, 15, 30], [21, 15, 30], [22, 16, 30], [23, 16, 29],
    [24, 17, 29], [25, 17, 28], [26, 18, 27], [27, 19, 26], [28, 19, 25],
  ]);
  spans('d', [[17, 14, 16], [18, 14, 17], [19, 14, 17], [20, 15, 18],
    [21, 15, 18], [22, 16, 19], [23, 16, 19], [24, 17, 20], [25, 17, 20]]);
  spans('k', [[14, 18, 23], [15, 17, 25], [16, 17, 26], [17, 18, 27],
    [18, 18, 28], [19, 19, 29], [20, 19, 29], [21, 20, 29], [22, 20, 28],
    [23, 21, 27], [24, 22, 26]]);
  spans('y', [[15, 18, 22], [16, 18, 24], [17, 19, 25], [18, 19, 26],
    [19, 20, 27], [20, 20, 27], [21, 21, 27], [22, 21, 26]]);
  spans('b', [[17, 24, 26], [18, 23, 27], [19, 22, 28], [20, 22, 28],
    [21, 23, 28], [22, 23, 27], [23, 22, 26], [24, 23, 25]]);
  spans('u', [[20, 26, 28], [21, 26, 28], [22, 25, 27], [23, 24, 26]]);
  spans('w', [[7, 14, 21], [8, 12, 23], [9, 12, 23], [10, 13, 22], [11, 15, 21]]);
  spans('k', [[8, 16, 18], [9, 16, 18], [10, 17, 18]]);
  spans('o', [[9, 8, 12], [10, 6, 12], [11, 7, 13], [12, 9, 14]]);
  spans('k', [[10, 6, 7], [11, 7, 8], [12, 9, 11]]);
  spans('g', [[27, 23, 25], [28, 23, 26], [29, 24, 27], [30, 24, 28],
    [31, 25, 29], [32, 25, 30], [33, 26, 31], [34, 26, 32], [35, 27, 33],
    [36, 28, 34], [37, 29, 34]]);
  spans('u', [[30, 26, 27], [32, 27, 29], [34, 28, 30], [36, 30, 32], [38, 31, 34]]);
  spans('t', [[30, 7, 18], [31, 5, 22], [32, 4, 25], [33, 5, 29], [34, 7, 31]]);
  spans('v', [[31, 6, 19], [33, 7, 24]]);
  spans('k', [[28, 18, 20], [29, 18, 20], [30, 18, 19], [30, 23, 25], [31, 23, 24]]);
  return { palette, rows: pixels.map(row => row.join('')) };
}

export const MOTIFS = {
  heart: sampleMotif((x, y) => {
    const hx = x * 1.3, hy = y * 1.3;
    return (hx * hx + hy * hy - 1) ** 3 - hx * hx * hy ** 3 <= 0;
  }),
  star: sampleMotif(insideStar),
  // Preserve the classic pixel-art silhouette by doubling each original cell.
  invader: invader16.flatMap(row => {
    const doubled = Array.from(row, cell => cell.repeat(2)).join('');
    return [doubled, doubled];
  }),
  landscape: sunsetLandscape(),
  parrot: parrotPicture(),
};

export function stitchSize(baseSize, stretchX, stretchY) {
  return { width: baseSize * stretchX / 100, height: baseSize * stretchY / 100 };
}
// Keep stitches the same size while the drawing surface grows around the stretched garment.
export function jumperLayout(width, height, stretchX, stretchY) {
  const scale = width * 0.7 / 456;
  const outlineWidth = 456 * scale * stretchX / 100;
  const outlineHeight = 331 * scale * stretchY / 100;
  return {
    scale,
    bodyWidth: 220 * scale * stretchX / 100,
    bodyHeight: 305 * scale * stretchY / 100,
    outlineWidth,
    outlineHeight,
    canvasWidth: Math.max(width, outlineWidth + width * 0.3),
    canvasHeight: Math.max(height, outlineHeight + height * 0.3),
  };
}
export function stitchStats(stretchX, stretchY, motifName = 'heart') {
  const grid = MOTIFS[motifName];
  const rows = Array.isArray(grid) ? grid : grid.rows;
  const height = rows.length, width = rows[0].length;
  return {
    count: `Stitches in the picture: ${width} × ${height} = ${(width * height).toLocaleString('en-GB')} (unchanged)`,
    size: `Each stitch is now ${(stretchX / 100).toFixed(1)}× wider and ${(stretchY / 100).toFixed(1)}× taller`,
  };
}

function shape(ctx, points, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fill();
}
// Every stitch is one square pixel on a shared 4.5-unit grid; fine gaps show the yarn.
// 48 stitches (216 units) sit centred in the 220-unit body.
const PITCH = 4.5, LEFT = 192, TOP = 101;
function knit(ctx, x, y, colour) {
  ctx.fillStyle = colour;
  ctx.fillRect(x + 0.3, y + 0.3, PITCH - 0.6, PITCH - 0.6);
}
// A fixed pseudo-random tone per stitch gives the wool texture without changing between redraws.
// An integer hash avoids the diagonal stripes a linear pattern shows on a fine grid.
const tone = (col, row, light, dark) => {
  let hash = Math.imul(col + 64, 0x27d4eb2d) ^ Math.imul(row + 64, 0x165667b1);
  hash = Math.imul(hash ^ (hash >>> 15), 0x85ebca6b);
  hash ^= hash >>> 13;
  return (hash >>> 0) % 5 === 0 ? dark : light;
};
function drawJumper(canvas, motifName, stretchX, stretchY, layout) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(canvas.width / layout.canvasWidth, 0, 0, canvas.height / layout.canvasHeight, 0, 0);
  ctx.clearRect(0, 0, layout.canvasWidth, layout.canvasHeight);
  ctx.save();
  ctx.translate(layout.canvasWidth / 2, layout.canvasHeight / 2);
  const { scale } = layout;
  ctx.scale(scale * stretchX / 100, scale * stretchY / 100);
  ctx.translate(-300, -240);
  const wool = ['#e0b18b', '#d6a27b'], sleeveWool = ['#cf9670', '#c48a65'], rib = '#b9795a', gap = '#9c6a50';
  const yarn = { heart: '#a92747', star: '#f5c648', invader: '#348b52' }[motifName];
  const sleeves = [
    [[190, 110], [154, 118], [72, 262], [126, 290], [190, 196]],
    [[410, 110], [446, 118], [528, 262], [474, 290], [410, 196]],
  ];
  for (const points of sleeves) {
    ctx.save();
    shape(ctx, points, gap);
    ctx.clip();
    for (let row = 0; row < 44; row++) for (let col = -30; col < 78; col++) {
      const x = LEFT + col * PITCH, y = TOP + row * PITCH;
      if (x < 60 || x > 530) continue;
      // The cuff is ribbed: the lowest stitches use a darker yarn.
      knit(ctx, x, y, y >= 254 ? rib : tone(col, row, ...sleeveWool));
    }
    ctx.restore();
  }
  ctx.save();
  shape(ctx, [[190, 110], [242, 98], [358, 98], [410, 110], [410, 403], [190, 403]], gap);
  ctx.clip();
  // The picture cells use the very same pitch as the surrounding wool stitches.
  const grid = MOTIFS[motifName];
  const rows = Array.isArray(grid) ? grid : grid.rows;
  const startRow = 16 - (rows.length - 32) / 2;
  const startCol = (48 - rows[0].length) / 2;
  for (let row = 0; row < 68; row++) for (let col = 0; col < 48; col++) {
    const key = rows[row - startRow]?.[col - startCol];
    const colour = Array.isArray(grid) ? key === '1' && yarn : grid.palette[key];
    knit(ctx, LEFT + col * PITCH, TOP + row * PITCH, colour || (row >= 64 ? rib : tone(col, row, ...wool)));
  }
  ctx.restore();
  ctx.fillStyle = '#f2d2ae';
  ctx.beginPath(); ctx.ellipse(300, 99, 61, 27, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = wool[0];
  ctx.beginPath(); ctx.ellipse(300, 91, 42, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function initJumperLab(root) {
  root.innerHTML = `
    <div class="hero"><div><span class="eyebrow"><span>✳</span> JUMPER LAB</span><h1 id="jumper-title">Knitted pixels. <em>Stretchy picture.</em></h1><p>Every stitch in a knitted jumper works like a pixel. Stretch the jumper and watch what happens to the picture.</p></div></div>
    <div class="workspace jumper-workspace">
      <div class="section-heading"><div><span class="step-label">01 / STRETCH IT</span><h2>Stretch the jumper <span>✳</span></h2></div><div id="jumper-nav" class="mode-nav-row"></div></div>
      <label class="select-label jumper-choice">KNITTED PICTURE <select id="jumper-motif"><option value="heart">Heart</option><option value="star">Star</option><option value="invader">Space invader</option><option value="landscape">Sunset landscape</option><option value="parrot">Parrot</option></select></label>
      <div class="jumper-frame"><canvas id="jumper-canvas" width="640" height="480" role="img" aria-label="Heart knitted picture, 100% sideways and 100% lengthways stretch"></canvas></div>
      <div class="jumper-controls"><label for="jumper-x">Stretch sideways <output id="jumper-x-value">100%</output></label><input id="jumper-x" type="range" min="100" max="400" step="5" value="100"><label for="jumper-y">Stretch lengthways <output id="jumper-y-value">100%</output></label><input id="jumper-y" type="range" min="100" max="400" step="5" value="100"><button id="jumper-reset" class="hint-button" type="button">Reset</button></div>
      <div class="jumper-stats" aria-live="polite"><p id="jumper-count"></p><p id="jumper-size"></p></div>
      <div class="tv-fact"><span>✳</span><div><strong>Same stitches, new shape.</strong><p>Stretching does not add stitches. The same stitches cover more space, so the picture gets distorted — just like stretching an image without keeping its aspect ratio.</p></div></div>
    </div>`;
  const get = id => root.querySelector('#jumper-' + id);
  const canvas = get('canvas');
  const paint = () => {
    const frame = canvas.parentElement;
    const frameWidth = frame.getBoundingClientRect().width;
    const x = Number(get('x').value), y = Number(get('y').value);
    const name = get('motif').value;
    if (frameWidth > 0) {
      const layout = jumperLayout(frameWidth, frameWidth * 3 / 4, x, y);
      canvas.style.width = `${layout.canvasWidth}px`;
      canvas.style.height = `${layout.canvasHeight}px`;
      const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1),
        4096 / layout.canvasWidth, 4096 / layout.canvasHeight);
      const width = Math.max(1, Math.round(layout.canvasWidth * dpr));
      const height = Math.max(1, Math.round(layout.canvasHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      drawJumper(canvas, name, x, y, layout);
      frame.scrollLeft = (layout.canvasWidth - frameWidth) / 2;
    }
    const stats = stitchStats(x, y, name);
    get('count').textContent = stats.count;
    get('size').textContent = stats.size;
    get('x-value').textContent = `${x}%`;
    get('y-value').textContent = `${y}%`;
    canvas.setAttribute('aria-label', `${{ heart: 'Heart', star: 'Star', invader: 'Space invader', landscape: 'Sunset landscape', parrot: 'Parrot' }[name]} knitted picture, ${x}% sideways and ${y}% lengthways stretch`);
  };
  get('motif').addEventListener('change', paint);
  for (const axis of ['x', 'y']) get(axis).addEventListener('input', paint);
  get('reset').addEventListener('click', () => { get('x').value = get('y').value = '100'; paint(); });
  window.addEventListener('resize', paint);
  if (typeof MutationObserver !== 'undefined') new MutationObserver(() => { if (!root.hidden) paint(); }).observe(root, { attributes: true, attributeFilter: ['hidden'] });
  paint();
}
