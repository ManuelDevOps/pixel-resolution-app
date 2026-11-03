import { dimensions, pixelCount, validatePhoto, workingDimensions } from './logic.js';
import { initTvLab } from './tv-lab.js';
import { initJumperLab } from './jumper-lab.js';
import { initTheme } from './theme.js';

let storage;
try { storage = window.sessionStorage; } catch { /* Storage can be disabled. */ }
initTheme(document, storage);

const $ = (selector, root = document) => root.querySelector(selector);
const explore = $('#explore');
const tvLab = $('#tv-lab');
const jumperLab = $('#jumper-lab');
const modeNav = $('.mode-switch');
function placeNavigation(mode) {
  const focused = modeNav.contains(document.activeElement) ? document.activeElement : null;
  $(`#${mode}-nav`).append(modeNav);
  if (focused) focused.focus();
}
let tvLabReady = false;
let jumperLabReady = false;
const steps = [8, 16, 32, 64, 128];
const sampleSteps = [...steps, 320];
const resolutionSteps = width => width ? [...steps.filter(step => step < width), width] : sampleSteps;

// Every preview is sampled from these original illustrations, never from another preview.
const artworks = [
  { name: 'Mountain', icon: '⛰', svg: `<rect width="320" height="240" fill="#c8e9ed"/><circle cx="256" cy="52" r="24" fill="#ffd270"/><path d="M0 187 99 58 181 168 222 105 320 204V240H0Z" fill="#738bb2"/><path d="m65 103 34-45 36 48-17-8-19 10-17-12zM205 128l17-23 18 26-18-8z" fill="#fff9ed"/><path d="M0 200Q80 166 159 205T320 183V240H0" fill="#568e84"/>` },
  { name: 'Rocket', icon: '✦', svg: `<rect width="320" height="240" fill="#252b5a"/><g fill="#fff5c5"><circle cx="54" cy="54" r="3"/><circle cx="265" cy="67" r="4"/><circle cx="73" cy="170" r="3"/><circle cx="252" cy="167" r="3"/></g><path d="M145 170Q120 111 160 36Q200 111 175 170Z" fill="#f7f2eb"/><path d="M160 36q-19 33-22 56h44q-4-25-22-56" fill="#f08778"/><circle cx="160" cy="113" r="16" fill="#80c7d6"/><path d="m139 143-22 25v22l28-17m36-30 22 25v22l-28-17" fill="#f08778"/><path d="m148 178 12 42 12-42" fill="#ffcf62"/>` },
  { name: 'Cat', icon: '◕', svg: `<rect width="320" height="240" fill="#efcfbe"/><circle cx="160" cy="128" r="76" fill="#ca8064"/><path d="m96 88 5-64 48 42M224 88l-5-64-48 42" fill="#ca8064"/><path d="m109 62 2-19 17 20m83-1-2-19-17 20" fill="#f6b8af"/><ellipse cx="133" cy="125" rx="8" ry="12" fill="#303242"/><ellipse cx="187" cy="125" rx="8" ry="12" fill="#303242"/><path d="m151 148 9 8 9-8z" fill="#593b3c"/><path d="M160 156v7m0 0q-9 10-18 0m18 0q9 10 18 0M125 151l-38-7m38 16-38 6m108-15 38-7m-38 16 38 6" stroke="#593b3c" stroke-width="3" fill="none"/>` },
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
  if (mode === 'tv' && !tvLabReady) {
    initTvLab(tvLab);
    tvLabReady = true;
  }
  if (mode === 'jumper' && !jumperLabReady) {
    initJumperLab(jumperLab);
    jumperLabReady = true;
  }
  explore.hidden = mode !== 'explore';
  tvLab.hidden = mode !== 'tv';
  jumperLab.hidden = mode !== 'jumper';
  placeNavigation(mode);
  for (const [id, active] of [['explore-tab', mode === 'explore'], ['tv-tab', mode === 'tv'], ['jumper-tab', mode === 'jumper']]) {
    $('#' + id).classList.toggle('active', active);
    $('#' + id).setAttribute('aria-pressed', String(active));
  }
  window.scrollTo(0, 0);
}
$('#explore-tab').addEventListener('click', () => setMode('explore'));
$('#tv-tab').addEventListener('click', () => setMode('tv'));
$('#jumper-tab').addEventListener('click', () => setMode('jumper'));

explore.innerHTML = `
  <div class="hero"><div><span class="eyebrow"><span>✳</span> THE PIXEL LAB</span><h1 id="explore-title">Small pixels. <em>Big picture.</em></h1><p>Every picture has a secret: it’s made of tiny squares. Change the resolution and see what happens.</p></div></div>
  <div class="workspace"><div class="section-heading"><div><span class="step-label">01 / EXPLORE</span><h2>Let’s look closer <span>✳</span></h2><p>Pick a picture, then adjust the resolution.</p></div><div id="explore-nav" class="mode-nav-row"></div><label class="select-label">YOUR IMAGE <select id="image-select"><option value="default" disabled>Included landscape</option><option value="0">Mountain landscape</option><option value="1">Rocket launch</option><option value="2">Curious cat</option><option value="photo" disabled>Your photo</option></select></label></div>
  <div id="drop-zone" class="upload-zone"><label id="upload-label" for="photo-input">Drag and drop the image here</label><span>or</span><input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose an image"><p>JPEG, PNG or WebP · up to 100 MB · processed only in your browser</p><p id="photo-error" class="upload-error" role="alert" aria-live="polite"></p></div>
  <div class="comparison"><figure class="image-card"><figcaption><span>ORIGINAL IMAGE</span><span class="card-tag">THE FULL PICTURE</span></figcaption><div class="picture"><canvas id="original" width="640" height="480" aria-label="Original illustration"></canvas></div><div class="card-bottom"><span id="source-size">Sample illustration: 320 × 240 px</span><span>✳</span></div></figure><figure class="image-card preview-card"><figcaption><span>PIXELATED PREVIEW</span><span class="live-dot">● LIVE</span></figcaption><div class="picture"><canvas id="preview" width="640" height="480" aria-label="Pixelated illustration"></canvas></div><div class="card-bottom">Your resolution <strong id="preview-size"></strong></div></figure></div>
  <div class="controls"><div class="resolution-head"><div><span class="step-label">MAKE A CHANGE</span><h3>Resolution <span>↔</span></h3></div><label class="grid-option"><input type="checkbox" id="grid"> Show pixel grid</label></div><div class="range-row"><span>LESS DETAIL</span><input id="resolution" type="range" min="0" max="5" value="5" step="1" aria-label="Image resolution"><span>MORE DETAIL</span></div><div class="range-ticks"><span>8 px</span><span>16 px</span><span>32 px</span><span>64 px</span><span>128 px</span><span>320 px</span></div><div class="stats"><div><span>WIDTH</span><strong id="width"></strong></div><b>×</b><div><span>HEIGHT</span><strong id="height"></strong></div><b>=</b><div class="total"><span>TOTAL PIXELS</span><strong id="total"></strong></div></div><p id="grid-note" class="hint" hidden>The grid is shown at 32 pixels wide or below, so individual squares remain visible.</p></div>
  <div class="notice"><span class="notice-icon">✳</span><div><strong>Something to think about</strong><p>What happens to the detail as you lower the resolution?</p></div></div></div>`;
placeNavigation('explore');
const select = $('#image-select');
let sampleStep = Number($('#resolution').value);
let photo = null;
let requestId = 0;
let pendingUrl = null;
let includedImage = null;
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
    $('#source-size').textContent = select.value === 'default' ? `Included landscape: ${photo.width} × ${photo.height} px` : `Working image: ${photo.width} × ${photo.height} px (original file unchanged)`;
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
  $('#grid-note').hidden = !$('#grid').checked || width <= 32;
}
function loadPhoto(file) {
  const error = $('#photo-error');
  error.textContent = validatePhoto(file);
  // A rejected file starts no decode, so it must not cancel a load in progress.
  if (error.textContent) return;
  const id = ++requestId;
  releaseUrl();
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
    photo = select.value === 'default' ? includedImage : null;
    select.querySelector('option[value="photo"]').disabled = true;
    setResolutionRange(photo?.width, photo ? resolutionSteps(photo.width).length - 1 : sampleStep);
  }
  $('#photo-error').textContent = '';
  updateExplore();
});
$('#resolution').addEventListener('input', () => {
  const width = resolutionSteps(photo?.width)[Number($('#resolution').value)];
  const sharedStep = (photo ? steps : sampleSteps).indexOf(width);
  if (sharedStep !== -1) sampleStep = sharedStep;
  updateExplore();
});
$('#grid').addEventListener('change', updateExplore);
updateExplore();

// Loading the included image must never displace a choice made while it decodes.
const initialRequest = requestId;
const defaultPhoto = new Image();
defaultPhoto.onload = () => {
  if (requestId !== initialRequest) return;
  try {
    const size = workingDimensions(defaultPhoto.naturalWidth, defaultPhoto.naturalHeight);
    if (!size) return;
    const previous = { photo, selection: select.value, step: Number($('#resolution').value) };
    try {
      includedImage = { image: defaultPhoto, ...size };
      select.querySelector('option[value="default"]').disabled = false;
      photo = includedImage;
      select.value = 'default';
      setResolutionRange(size.width, resolutionSteps(size.width).length - 1);
      updateExplore();
    } catch {
      includedImage = null;
      select.querySelector('option[value="default"]').disabled = true;
      photo = previous.photo;
      select.value = previous.selection;
      setResolutionRange(photo?.width, previous.step);
      updateExplore();
    }
  } catch { /* Keep the usable sample if the included image cannot be rendered. */ }
};
defaultPhoto.onerror = () => { /* The sample remains available if the asset is unavailable. */ };
defaultPhoto.src = '/assets/landscape-720p.png';
