import { dimensions, imageBytes, guessPoints, lowestUseful, pixelCount, bestFit, validatePhoto, workingDimensions } from './logic.js';

const $ = (selector, root = document) => root.querySelector(selector);
const explore = $('#explore');
const challenge = $('#challenge');
const steps = [8, 16, 32, 64, 128];
const resolutionSteps = width => width ? [...steps.filter(step => step < width), width] : steps;

// Every preview is sampled from these original illustrations, never from another preview.
const artworks = [
  { name: 'Mountain', icon: '⛰', svg: `<rect width="320" height="240" fill="#c8e9ed"/><circle cx="256" cy="52" r="24" fill="#ffd270"/><path d="M0 187 99 58 181 168 222 105 320 204V240H0Z" fill="#738bb2"/><path d="m65 103 34-45 36 48-17-8-19 10-17-12zM205 128l17-23 18 26-18-8z" fill="#fff9ed"/><path d="M0 200Q80 166 159 205T320 183V240H0" fill="#568e84"/>` },
  { name: 'Rocket', icon: '✦', svg: `<rect width="320" height="240" fill="#252b5a"/><g fill="#fff5c5"><circle cx="54" cy="54" r="3"/><circle cx="265" cy="67" r="4"/><circle cx="73" cy="170" r="3"/><circle cx="252" cy="167" r="3"/></g><path d="M145 170Q120 111 160 36Q200 111 175 170Z" fill="#f7f2eb"/><path d="M160 36q-19 33-22 56h44q-4-25-22-56" fill="#f08778"/><circle cx="160" cy="113" r="16" fill="#80c7d6"/><path d="m139 143-22 25v22l28-17m36-30 22 25v22l-28-17" fill="#f08778"/><path d="m148 178 12 42 12-42" fill="#ffcf62"/>` },
  { name: 'Cat', icon: '◕', svg: `<rect width="320" height="240" fill="#efcfbe"/><circle cx="160" cy="128" r="76" fill="#ca8064"/><path d="m96 88 5-64 48 42M224 88l-5-64-48 42" fill="#ca8064"/><path d="m109 62 2-19 17 20m83-1-2-19-17 20" fill="#f6b8af"/><ellipse cx="133" cy="125" rx="8" ry="12" fill="#303242"/><ellipse cx="187" cy="125" rx="8" ry="12" fill="#303242"/><path d="m151 148 9 8 9-8z" fill="#593b3c"/><path d="M160 156v7m0 0q-9 10-18 0m18 0q9 10 18 0M125 151l-38-7m38 16-38 6m108-15 38-7m-38 16 38 6" stroke="#593b3c" stroke-width="3" fill="none"/>` },
  { name: 'Sign', icon: '▣', svg: `<rect width="320" height="240" fill="#b9dfe4"/><path d="M0 178Q80 150 160 183t160-9v66H0" fill="#76a68b"/><rect x="152" y="130" width="16" height="96" fill="#725848"/><rect x="55" y="49" width="210" height="100" rx="12" fill="#fdf7e8" stroke="#344456" stroke-width="8"/><text x="160" y="120" text-anchor="middle" font-family="Arial" font-size="67" font-weight="bold" fill="#344456">GO</text>` },
];
const images = artworks.map(item => {
  const image = new Image();
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">${item.svg}</svg>`);
  return image;
});
function draw(canvas, index, width, grid = false) {
  const img = images[index];
  const drawId = canvas.dataset.drawId = String(Number(canvas.dataset.drawId || 0) + 1);
  const paint = () => {
    if (canvas.dataset.drawId !== drawId) return;
    const { height } = dimensions(width, 4, 3);
    const small = document.createElement('canvas');
    small.width = width; small.height = height;
    small.getContext('2d').drawImage(img, 0, 0, width, height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
    if (grid && width <= 32) {
      ctx.strokeStyle = 'rgba(25,32,55,.25)'; ctx.lineWidth = 1;
      for (let x = 0; x <= width; x++) { ctx.beginPath(); ctx.moveTo(x * canvas.width / width, 0); ctx.lineTo(x * canvas.width / width, canvas.height); ctx.stroke(); }
      for (let y = 0; y <= height; y++) { ctx.beginPath(); ctx.moveTo(0, y * canvas.height / height); ctx.lineTo(canvas.width, y * canvas.height / height); ctx.stroke(); }
    }
  };
  if (img.complete && img.naturalWidth) paint();
  else img.addEventListener('load', paint, { once: true });
}
function setMode(mode) {
  const isExplore = mode === 'explore';
  explore.hidden = !isExplore; challenge.hidden = isExplore;
  for (const [id, active] of [['explore-tab', isExplore], ['challenge-tab', !isExplore]]) {
    $('#' + id).classList.toggle('active', active);
    $('#' + id).setAttribute('aria-pressed', String(active));
  }
  window.scrollTo(0, 0);
}
$('#explore-tab').addEventListener('click', () => setMode('explore'));
$('#challenge-tab').addEventListener('click', () => setMode('challenge'));

explore.innerHTML = `
  <div class="hero"><div><span class="eyebrow"><span>✳</span> THE PIXEL LAB</span><h1 id="explore-title">Small pixels.<br><em>Big picture.</em></h1><p>Every picture has a secret: it’s made of tiny squares. Change the resolution and see what happens.</p></div><div class="hero-stamp" aria-hidden="true">LOOK<br>CLOSER <span>↘</span></div></div>
  <div class="workspace"><div class="section-heading"><div><span class="step-label">01 / EXPLORE</span><h2>Let’s look closer <span>✳</span></h2><p>Pick a picture, then adjust the resolution.</p></div><label class="select-label">YOUR IMAGE <select id="image-select"><option value="0">Mountain landscape</option><option value="1">Rocket launch</option><option value="2">Curious cat</option><option value="photo" disabled>Your photo</option></select></label></div>
  <div id="drop-zone" class="upload-zone"><label id="upload-label" for="photo-input">Drag and drop the image here</label><span>or</span><input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose an image"><p>JPEG, PNG or WebP · up to 100 MB · processed only in your browser</p><p id="photo-error" class="upload-error" role="alert" aria-live="polite"></p></div>
  <div class="comparison"><figure class="image-card"><figcaption><span>ORIGINAL IMAGE</span><span class="card-tag">THE FULL PICTURE</span></figcaption><div class="picture"><canvas id="original" width="640" height="480" aria-label="Original illustration"></canvas></div><div class="card-bottom"><span id="source-size">Sample illustration: 320 × 240 px</span><span>✳</span></div></figure><figure class="image-card preview-card"><figcaption><span>PIXELATED PREVIEW</span><span class="live-dot">● LIVE</span></figcaption><div class="picture"><canvas id="preview" width="640" height="480" aria-label="Pixelated illustration"></canvas></div><div class="card-bottom">Your resolution <strong id="preview-size"></strong></div></figure></div>
  <div class="controls"><div class="resolution-head"><div><span class="step-label">MAKE A CHANGE</span><h3>Resolution <span>↔</span></h3></div><label class="grid-option"><input type="checkbox" id="grid"> Show pixel grid</label></div><div class="range-row"><span>LESS DETAIL</span><input id="resolution" type="range" min="0" max="4" value="2" step="1" aria-label="Image resolution"><span>MORE DETAIL</span></div><div class="range-ticks"><span>8 px</span><span>16 px</span><span>32 px</span><span>64 px</span><span>128 px</span></div><div class="stats"><div><span>WIDTH</span><strong id="width"></strong></div><b>×</b><div><span>HEIGHT</span><strong id="height"></strong></div><b>=</b><div class="total"><span>TOTAL PIXELS</span><strong id="total"></strong></div></div><p id="grid-note" class="hint" hidden>The grid is shown at 32 pixels wide or below, so individual squares remain visible.</p></div>
  <div class="notice"><span class="notice-icon">✳</span><div><strong>Something to think about</strong><p>What happens to the detail as you lower the resolution?</p></div></div>
  <details class="details"><summary>Estimated uncompressed size <span>＋</span></summary><p id="storage"></p><p>Real file sizes can differ because of compression and file information.</p></details>
  <div class="workspace-bottom"><p>Ready to put your pixels to the test?</p><button class="primary" id="try-challenge">Try a challenge <span>↗</span></button></div></div>`;
const select = $('#image-select');
let sampleStep = Number($('#resolution').value);
let photo = null;
let requestId = 0;
let pendingUrl = null;
function releaseUrl() {
  if (pendingUrl) URL.revokeObjectURL(pendingUrl);
  pendingUrl = null;
}
function paintPhoto(canvas, width, grid = false) {
  // Reset the canvas and invalidate any pending illustration load callback.
  canvas.dataset.drawId = String(Number(canvas.dataset.drawId || 0) + 1);
  const height = dimensions(width, photo.width, photo.height).height;
  const display = workingDimensions(photo.width, photo.height, 640);
  canvas.width = display.width;
  canvas.height = display.height;
  const small = document.createElement('canvas');
  small.width = width; small.height = height;
  small.getContext('2d').drawImage(photo.image, 0, 0, width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
  if (grid && width <= 32) {
    ctx.strokeStyle = 'rgba(25,32,55,.25)'; ctx.lineWidth = 1;
    for (let x = 0; x <= width; x++) { ctx.beginPath(); ctx.moveTo(x * canvas.width / width, 0); ctx.lineTo(x * canvas.width / width, canvas.height); ctx.stroke(); }
    for (let y = 0; y <= height; y++) { ctx.beginPath(); ctx.moveTo(0, y * canvas.height / height); ctx.lineTo(canvas.width, y * canvas.height / height); ctx.stroke(); }
  }
}
function setResolutionRange(width, selected) {
  const values = resolutionSteps(width);
  const slider = $('#resolution');
  slider.max = String(values.length - 1);
  slider.value = String(Math.min(selected, values.length - 1));
  $('.range-ticks').innerHTML = values.map(value => `<span>${value} px</span>`).join('');
}
function updateExplore() {
  const width = resolutionSteps(photo?.width)[Number($('#resolution').value)];
  const { height } = dimensions(width, photo?.width || 4, photo?.height || 3);
  const index = Number(select.value);
  if (photo) {
    paintPhoto($('#original'), photo.width);
    paintPhoto($('#preview'), width, $('#grid').checked);
    $('#source-size').textContent = `Working image: ${photo.width} × ${photo.height} px (original file unchanged)`;
  } else {
    // Switching back to a sample restores the fixed artwork canvas size.
    for (const canvas of [$('#original'), $('#preview')]) { canvas.width = 640; canvas.height = 480; }
    draw($('#original'), index, 320);
    draw($('#preview'), index, width, $('#grid').checked);
    $('#source-size').textContent = 'Sample illustration: 320 × 240 px';
  }
  $('#width').textContent = `${width} px`; $('#height').textContent = `${height} px`;
  $('#total').textContent = pixelCount(width, height).toLocaleString('en-GB');
  $('#preview-size').textContent = `${width} × ${height} px`;
  $('#resolution').setAttribute('aria-valuetext', `${width} × ${height} px`);
  $('#storage').textContent = `${width} × ${height} pixels × 24 bits per pixel ÷ 8 = ${imageBytes(width, height, 24).toLocaleString('en-GB')} bytes of uncompressed pixel data.`;
  $('#grid-note').hidden = !$('#grid').checked || width <= 32;
}
function loadPhoto(file) {
  const id = ++requestId;
  releaseUrl();
  const error = $('#photo-error');
  error.textContent = validatePhoto(file);
  if (error.textContent) return;
  const img = new Image();
  try {
    const url = URL.createObjectURL(file);
    pendingUrl = url;
    img.onload = () => {
      if (id !== requestId) return;
      const size = workingDimensions(img.naturalWidth, img.naturalHeight);
      if (!size) { releaseUrl(); error.textContent = 'Could not read this image. Try another JPEG, PNG or WebP file.'; return; }
      try {
        const working = document.createElement('canvas');
        working.width = size.width; working.height = size.height;
        working.getContext('2d').drawImage(img, 0, 0, size.width, size.height);
        const previous = photo;
        const previousSelection = select.value;
        const photoOption = select.querySelector('option[value="photo"]');
        const previousDisabled = photoOption.disabled;
        const previousStep = Number($('#resolution').value);
        try {
          photo = { image: working, ...size };
          photoOption.disabled = false;
          select.value = 'photo';
          setResolutionRange(size.width, resolutionSteps(size.width).length - 1);
          updateExplore();
        } catch (renderError) {
          photo = previous;
          photoOption.disabled = previousDisabled;
          select.value = previousSelection;
          setResolutionRange(previous?.width, previousStep);
          updateExplore();
          throw renderError;
        }
        releaseUrl();
        error.textContent = '';
      } catch {
        releaseUrl();
        error.textContent = 'Could not read this image. Try another JPEG, PNG or WebP file.';
      }
    };
    img.onerror = () => {
      if (id !== requestId) return;
      releaseUrl();
      error.textContent = 'Could not read this image. Try another JPEG, PNG or WebP file.';
    };
    img.src = url;
  } catch {
    releaseUrl();
    error.textContent = 'Could not read this image. Try another JPEG, PNG or WebP file.';
  }
}
$('#photo-input').addEventListener('change', event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (file) loadPhoto(file);
});
const dropZone = $('#drop-zone');
dropZone.addEventListener('dragover', event => { event.preventDefault(); dropZone.classList.add('dragging'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
dropZone.addEventListener('drop', event => {
  event.preventDefault(); dropZone.classList.remove('dragging');
  loadPhoto(event.dataTransfer?.files?.[0]);
});
select.addEventListener('change', () => {
  ++requestId; releaseUrl();
  if (select.value !== 'photo') {
    photo = null;
    select.querySelector('option[value="photo"]').disabled = true;
    setResolutionRange(null, sampleStep);
  }
  $('#photo-error').textContent = '';
  updateExplore();
});
$('#resolution').addEventListener('input', () => {
  const width = resolutionSteps(photo?.width)[Number($('#resolution').value)];
  const sharedStep = steps.indexOf(width);
  if (sharedStep !== -1) sampleStep = sharedStep;
  updateExplore();
});
$('#grid').addEventListener('change', updateExplore);
$('#try-challenge').addEventListener('click', () => setMode('challenge'));
updateExplore();

const games = [
  { id: 'guess', number: '01', icon: '◉', title: 'Guess the image', text: 'Can you recognise a picture with fewer pixels?' },
  { id: 'detail', number: '02', icon: '⌕', title: 'Find the detail', text: 'Find the lowest resolution that reveals a detail.' },
  { id: 'maths', number: '03', icon: '⊞', title: 'Pixel maths', text: 'Work out how many pixels make the picture.' },
  { id: 'fit', number: '04', icon: '▧', title: 'Choose the best fit', text: 'Pick a sensible resolution for the job.' },
];
let gameState = {};
function showGames() {
  challenge.innerHTML = `<div class="challenge-intro"><span class="eyebrow"><span>✳</span> THE CHALLENGE ZONE</span><h1 id="challenge-title">Ready, set, <em>pixel.</em></h1><p>Put your curiosity to the test. Pick a challenge to get started.</p></div><div class="game-grid">${games.map(g => `<article class="game-card"><div class="game-top"><span class="game-icon">${g.icon}</span><span class="step-label">CHALLENGE ${g.number}</span></div><h2>${g.title}</h2><p>${g.text}</p><button class="game-link" data-game="${g.id}">Let's play <span>↗</span></button></article>`).join('')}</div><div class="notice challenge-notice"><span class="notice-icon">✳</span><div><strong>Curious about something?</strong><p>You can always switch back to Explore and try it out.</p></div></div>`;
  challenge.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => startGame(button.dataset.game)));
}
function startGame(id) { gameState = { id, round: 0, score: 0, hints: 0, answered: false, detailStep: 0 }; renderGame(); }
const questions = [
  { image: 1, answer: 'Rocket', options: ['Rocket', 'Bicycle', 'Tree'] },
  { image: 2, answer: 'Cat', options: ['Dog', 'Cat', 'Owl'] },
  { image: 0, answer: 'Mountain', options: ['Mountain', 'Castle', 'Wave'] },
];
function gameFrame(title, content, meta = '') {
  challenge.innerHTML = `<div class="game-shell"><div class="game-heading"><button class="back-link" id="all-games">← All challenges</button><span class="step-label">${meta}</span></div><h1 id="challenge-title">${title}</h1>${content}<div id="feedback" class="feedback" role="status" aria-live="polite" hidden></div></div>`;
  $('#all-games').addEventListener('click', showGames);
}
function feedback(correct, text, next) {
  const box = $('#feedback'); box.hidden = false;
  box.className = `feedback ${correct ? 'correct' : 'incorrect'}`;
  box.innerHTML = `<strong>${correct ? '✳ Nice work!' : '↗ Not quite!'}</strong><p>${text}</p>${next ? '<button class="primary" id="next">Next round →</button>' : ''}`;
  if (next) $('#next').addEventListener('click', next);
}
function renderGame() {
  const s = gameState;
  if (s.id === 'guess') {
    if (s.round >= questions.length) {
      gameFrame('Challenge complete!', `<p class="game-lead">You scored <strong>${s.score} out of ${questions.length * 3}</strong> points. Higher resolution can reveal details that were present in the original image.</p><button class="primary" id="play-again">Play again ↗</button>`, 'GUESS THE IMAGE');
      $('#play-again').addEventListener('click', () => startGame('guess')); return;
    }
    const q = questions[s.round]; const width = steps[s.hints]; const { height } = dimensions(width, 4, 3);
    gameFrame('Guess the image', `<p class="game-lead">What can you see? Use a hint to reveal more detail.</p><div class="play-layout"><div><div class="game-image"><canvas id="game-canvas" width="640" height="480" aria-label="Mystery pixelated image"></canvas></div><p class="image-caption">${width} × ${height} pixels</p></div><div><span class="step-label">MAKE YOUR GUESS</span><h2>What is the image?</h2><div class="answers">${q.options.map(o => `<button data-answer="${o}">${o} <span>↗</span></button>`).join('')}</div><button class="hint-button" id="reveal" ${s.hints >= 2 ? 'disabled' : ''}>✳ Reveal more detail</button><p class="hint">Each hint shows a higher-resolution version of the original.</p></div></div>`, `ROUND ${s.round + 1} / ${questions.length} &nbsp; · &nbsp; HINTS ${s.hints} / 2 &nbsp; · &nbsp; SCORE ${s.score}`);
    draw($('#game-canvas'), q.image, width);
    $('#reveal').addEventListener('click', () => { s.hints++; renderGame(); });
    challenge.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', () => {
      if (s.answered) return; s.answered = true;
      const correct = b.dataset.answer === q.answer; s.score += guessPoints(correct, s.hints);
      challenge.querySelectorAll('[data-answer], #reveal').forEach(el => el.disabled = true);
      feedback(correct, `It is ${q.answer.toLowerCase() === 'owl' ? 'an' : 'a'} ${q.answer.toLowerCase()}. A higher-resolution version uses more pixels to show details from the original.`, () => { s.round++; s.hints = 0; s.answered = false; renderGame(); });
    }));
  } else if (s.id === 'detail') {
    const width = steps[s.detailStep], height = dimensions(width, 4, 3).height;
    gameFrame('Find the detail', `<p class="game-lead">The sign says <strong>GO</strong>. Find the lowest resolution where both letters can be read, then check your choice.</p><div class="detail-layout"><div class="game-image"><canvas id="game-canvas" width="640" height="480" aria-label="A sign with text shown at the selected resolution"></canvas></div><div><label class="step-label" for="detail-resolution">CHANGE RESOLUTION</label><input type="range" id="detail-resolution" min="0" max="4" value="${s.detailStep}" step="1"><p class="detail-value">${width} × ${height} <span>pixels</span></p><p class="hint">Move the slider and look closely at the letters.</p><button class="primary" id="check-detail">Check my answer ↗</button></div></div>`, 'FIND THE DETAIL');
    draw($('#game-canvas'), 3, width);
    $('#detail-resolution').addEventListener('input', e => { s.detailStep = Number(e.target.value); renderGame(); $('#detail-resolution').focus(); });
    $('#check-detail').addEventListener('click', () => feedback(lowestUseful(width, 32), width < 32 ? 'At this resolution the letters lose too much detail. Try a higher setting.' : width > 32 ? 'The letters are visible, but try a lower setting: you might need fewer pixels.' : 'At 32 × 24 pixels, both letters can be recognised. More pixels are not always necessary.'));
  } else if (s.id === 'maths') {
    gameFrame('Pixel maths', `<p class="game-lead">An image is <strong>32 pixels wide</strong> and <strong>24 pixels high</strong>. How many pixels does it contain?</p><div class="math-panel"><span>32 px</span><strong>×</strong><span>24 px</span><strong>=</strong><span>?</span></div><div class="answers row">${[56, 768, 1024].map(n => `<button data-answer="${n}">${n.toLocaleString('en-GB')} pixels</button>`).join('')}</div>`, 'PIXEL MATHS');
    challenge.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', () => feedback(Number(b.dataset.answer) === pixelCount(32, 24), 'Multiply the width by the height: 32 × 24 = 768 pixels.')));
  } else {
    gameFrame('Choose the best fit', `<p class="game-lead">You need a small <strong>64 × 64 pixel icon</strong> for a website. Which square image is the most sensible fit?</p><div class="answers row">${[16, 64, 2048].map(n => `<button data-answer="${n}">${n} × ${n} px</button>`).join('')}</div>`, 'CHOOSE THE BEST FIT');
    challenge.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', () => feedback(bestFit('icon', Number(b.dataset.answer)), '64 × 64 matches the display size. 16 × 16 may look blocky; 2048 × 2048 carries far more pixels than this small icon needs.')));
  }
}
showGames();
