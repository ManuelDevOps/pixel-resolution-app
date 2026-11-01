import { validatePhoto, workingDimensions } from './logic.js';

// Retain the original TV-resolution exports for compatibility.
export const TV_STANDARDS = {
  hd: { label: 'HD', width: 1280, height: 720 },
  fhd: { label: 'Full HD', width: 1920, height: 1080 },
  uhd: { label: '4K UHD', width: 3840, height: 2160 },
};

export function pixelTotal(id) {
  const { width, height } = TV_STANDARDS[id];
  return width * height;
}

export function signalFit(screen, source) {
  const screenPixels = pixelTotal(screen);
  const sourcePixels = pixelTotal(source);
  if (sourcePixels < screenPixels) return 'upscaled';
  if (sourcePixels > screenPixels) return 'downscaled';
  return 'matched';
}

export function screenPhrase(id) {
  return `${id === 'hd' ? 'an' : 'a'} ${TV_STANDARDS[id].label} screen`;
}

export function answerTvQuestion(answer) {
  return {
    correct: answer === 'upscaled',
    explanation: 'The TV upscales the Full HD image to fit its 4K screen. Upscaling does not automatically recover detail missing from the source.',
  };
}

export function answerSizeQuestion(answer) {
  return {
    correct: answer === 'same-pixels',
    explanation: 'The same pixels cover more space on the larger TV, so they may be easier to notice at the same viewing distance.',
  };
}

export const TV_SIZES = [32, 45, 70];
export const tvWorkingDimensions = (width, height) => workingDimensions(width, height, 3840);

export function hdPhotoDimensions(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const scale = Math.min(1, 1280 / width, 720 / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function zoomRect(width, height, diagonal) {
  // The zooms represent the same physical area, centred on the same detail.
  const fraction = 0.08 * 32 / diagonal;
  const cropWidth = width * fraction;
  const cropHeight = height * fraction;
  return { x: (width - cropWidth) / 2, y: (height - cropHeight) / 2, width: cropWidth, height: cropHeight };
}

function drawFrame(ctx, width, height) {
  ctx.save();
  ctx.scale(width / 960, height / 540);
  ctx.fillStyle = '#bfe7ed'; ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(750, 110, 54, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8299c4'; ctx.beginPath(); ctx.moveTo(0, 415); ctx.lineTo(250, 115); ctx.lineTo(450, 395); ctx.lineTo(640, 180); ctx.lineTo(960, 435); ctx.lineTo(960, 540); ctx.lineTo(0, 540); ctx.fill();
  ctx.fillStyle = '#f9f6ef'; ctx.beginPath(); ctx.moveTo(188, 190); ctx.lineTo(250, 115); ctx.lineTo(316, 207); ctx.lineTo(265, 181); ctx.lineTo(237, 198); ctx.lineTo(218, 185); ctx.fill();
  ctx.fillStyle = '#77ad99'; ctx.beginPath(); ctx.moveTo(0, 410); ctx.quadraticCurveTo(240, 320, 480, 430); ctx.quadraticCurveTo(730, 350, 960, 410); ctx.lineTo(960, 540); ctx.lineTo(0, 540); ctx.fill();
  ctx.fillStyle = '#4d7d70'; ctx.fillRect(0, 490, 960, 50);
  ctx.fillStyle = '#4a4d63'; ctx.fillRect(475, 292, 10, 150);
  ctx.fillStyle = '#fff7e8'; ctx.fillRect(402, 245, 156, 72);
  ctx.strokeStyle = '#4a4d63'; ctx.lineWidth = 4; ctx.strokeRect(402, 245, 156, 72);
  ctx.fillStyle = '#34394e'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PIXEL PARK', 480, 275);
  ctx.font = '14px sans-serif'; ctx.fillText('LOOK CLOSER', 480, 297);
  ctx.strokeStyle = '#34394e'; ctx.lineWidth = 0.8;
  for (let i = 0; i < 28; i++) { ctx.beginPath(); ctx.moveTo(407 + i * 5.2, 304); ctx.lineTo(407 + i * 5.2, 311); ctx.stroke(); }
  ctx.restore();
}

function defaultImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 3840;
  canvas.height = 2160;
  drawFrame(canvas.getContext('2d'), canvas.width, canvas.height);
  return canvas;
}

function makeHdImage(original) {
  const size = hdPhotoDimensions(original.width, original.height);
  if (size.width === original.width && size.height === original.height) return original;
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext('2d').drawImage(original, 0, 0, size.width, size.height);
  return canvas;
}

function virtualFrame(image) {
  // Letterbox without resizing the source. The virtual frame need not be allocated.
  if (image.width / image.height >= 16 / 9) {
    const height = image.width * 9 / 16;
    return { width: image.width, height, x: 0, y: (height - image.height) / 2 };
  }
  const width = image.height * 16 / 9;
  return { width, height: image.height, x: (width - image.width) / 2, y: 0 };
}

function drawTvImage(canvas, image, diagonal, zoomed) {
  const frame = virtualFrame(image);
  const rect = zoomed ? zoomRect(frame.width, frame.height, diagonal) : { x: 0, y: 0, width: frame.width, height: frame.height };
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#28293a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.imageSmoothingEnabled = !zoomed;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  ctx.setTransform(scaleX, 0, 0, scaleY, -rect.x * scaleX, -rect.y * scaleY);
  ctx.drawImage(image, frame.x, frame.y);
  ctx.restore();
}

export function initTvLab(root) {
  let original = defaultImage();
  let hdImage = null;
  let quality = 'original';
  let imageDescription = `Example image: ${original.width.toLocaleString('en-GB')} × ${original.height.toLocaleString('en-GB')} px`;
  let requestId = 0;
  let pendingUrl = null;

  root.innerHTML = `
    <div class="challenge-intro"><span class="eyebrow"><span>✳</span> TV SIZE LAB</span><h1 id="tv-title">One image. <em>Three TV sizes.</em></h1><p>Explore how image resolution can look different as the screen gets bigger.</p></div>
    <div class="workspace tv-workspace">
      <div class="section-heading"><div><span class="step-label">01 / YOUR IMAGE</span><h2>Choose an image <span>✳</span></h2><p>Upload once to show the same picture on all three TVs.</p></div></div>
      <div id="tv-drop-zone" class="upload-zone"><label for="tv-photo-input">Drag and drop the image here</label><span>or</span><input id="tv-photo-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose an image for TV Lab"><p>JPEG, PNG or WebP · up to 100 MB · stays in your browser</p><p id="tv-photo-error" class="upload-error" role="alert" aria-live="polite"></p></div>
      <div class="tv-quality"><div><span class="step-label">IMAGE DETAIL</span><p>Compare the working image with an HD version.</p></div><div class="tv-quality-buttons" role="group" aria-label="Image detail"><button id="tv-original" aria-pressed="true">Original</button><button id="tv-hd" aria-pressed="false">Simulate HD</button></div></div>
      <p id="tv-image-info" class="tv-note" aria-live="polite"></p>
      <div class="tv-size-screens">${TV_SIZES.map(diagonal => `<figure class="tv-size-screen" style="--diagonal:${diagonal};--screen-width:${diagonal / 70 * 100}%"><div class="tv-size-bezel"><canvas width="640" height="360" data-tv-size="${diagonal}" aria-label="Simulated ${diagonal}-inch television"></canvas></div><figcaption>${diagonal}″ <span>TV</span></figcaption></figure>`).join('')}</div>
      <div class="tv-tools"><button id="tv-look-closer" class="hint-button" aria-pressed="false">⌕ Look closer</button><p>The TVs are shown in proportion. They are simulations, not actual physical sizes.</p></div>
      <div id="tv-closeups" class="tv-closeups" hidden>${TV_SIZES.map(diagonal => `<figure><canvas width="640" height="360" data-tv-zoom="${diagonal}" aria-label="Magnified centre of ${diagonal}-inch television"></canvas><figcaption>${diagonal}″ TV</figcaption></figure>`).join('')}</div>
      <p id="tv-zoom-note" class="tv-note" hidden>The close-ups show the same physical area centred on the same detail. A larger TV spreads the same source pixels over a larger surface.</p>
      <div class="tv-fact"><span>✳</span><div><strong>Same image, larger screen.</strong><p>The image does not lose pixels when the TV gets bigger. Its existing pixels cover more space and may be easier to notice at the same viewing distance.</p></div></div>
      <p class="tv-note">This is a simplified simulation, assuming the same viewing distance. Real results also depend on the TV panel, scaling and source quality.</p>
    </div>
    <div class="workspace tv-quiz"><span class="step-label">02 / TRY IT</span><h2>Put it to the test <span>✳</span></h2><p>You show the same HD image on 32″ and 70″ TVs at the same distance. What changes?</p><div class="tv-answers"><button data-tv-answer="loses-pixels">The image loses pixels when the TV gets bigger.</button><button data-tv-answer="same-pixels">The same pixels cover more space on the larger screen.</button><button data-tv-answer="gains-detail">The larger TV automatically adds detail to the image.</button></div><div id="tv-feedback" class="feedback" role="status" aria-live="polite" hidden></div></div>`;

  const get = selector => root.querySelector(selector);
  const releaseUrl = () => {
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    pendingUrl = null;
  };
  const paint = () => {
    if (quality === 'hd' && !hdImage) hdImage = makeHdImage(original);
    const image = quality === 'hd' ? hdImage : original;
    for (const diagonal of TV_SIZES) {
      drawTvImage(get(`[data-tv-size="${diagonal}"]`), image, diagonal, false);
      if (!get('#tv-closeups').hidden) drawTvImage(get(`[data-tv-zoom="${diagonal}"]`), image, diagonal, true);
    }
    get('#tv-image-info').textContent = `${imageDescription}. ${quality === 'hd' ? `HD simulation: ${image.width.toLocaleString('en-GB')} × ${image.height.toLocaleString('en-GB')} px of image detail (maximum 1280 × 720). Smaller images are not enhanced.` : 'Original working-image detail.'}`;
    get('#tv-original').setAttribute('aria-pressed', String(quality === 'original'));
    get('#tv-hd').setAttribute('aria-pressed', String(quality === 'hd'));
  };
  const loadPhoto = file => {
    const id = ++requestId;
    releaseUrl();
    const error = get('#tv-photo-error');
    error.textContent = validatePhoto(file);
    if (error.textContent) return;
    const image = new Image();
    try {
      pendingUrl = URL.createObjectURL(file);
      image.onload = () => {
        if (id !== requestId) return;
        try {
          const size = tvWorkingDimensions(image.naturalWidth, image.naturalHeight);
          if (!size) throw new Error('Invalid dimensions');
          const working = document.createElement('canvas');
          working.width = size.width;
          working.height = size.height;
          working.getContext('2d').drawImage(image, 0, 0, size.width, size.height);
          const previous = { original, hdImage, imageDescription };
          try {
            original = working;
            hdImage = null;
            const resized = size.width !== image.naturalWidth || size.height !== image.naturalHeight;
            imageDescription = `Working image: ${size.width.toLocaleString('en-GB')} × ${size.height.toLocaleString('en-GB')} px${resized ? ' (resized for TV Lab)' : ''}`;
            paint();
          } catch (renderError) {
            ({ original, hdImage, imageDescription } = previous);
            paint();
            throw renderError;
          }
          releaseUrl();
          error.textContent = '';
        } catch {
          releaseUrl();
          error.textContent = 'Could not read this image. Try another JPEG, PNG or WebP file.';
        }
      };
      image.onerror = () => {
        if (id !== requestId) return;
        releaseUrl();
        error.textContent = 'Could not read this image. Try another JPEG, PNG or WebP file.';
      };
      image.src = pendingUrl;
    } catch {
      releaseUrl();
      error.textContent = 'Could not read this image. Try another JPEG, PNG or WebP file.';
    }
  };
  get('#tv-photo-input').addEventListener('change', event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) loadPhoto(file);
  });
  const dropZone = get('#tv-drop-zone');
  dropZone.addEventListener('dragover', event => { event.preventDefault(); dropZone.classList.add('dragging'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
  dropZone.addEventListener('drop', event => {
    event.preventDefault();
    dropZone.classList.remove('dragging');
    loadPhoto(event.dataTransfer?.files?.[0]);
  });
  for (const mode of ['original', 'hd']) {
    get(`#tv-${mode}`).addEventListener('click', () => { quality = mode; paint(); });
  }
  get('#tv-look-closer').addEventListener('click', event => {
    const closeups = get('#tv-closeups');
    closeups.hidden = !closeups.hidden;
    get('#tv-zoom-note').hidden = closeups.hidden;
    event.currentTarget.setAttribute('aria-pressed', String(!closeups.hidden));
    event.currentTarget.textContent = closeups.hidden ? '⌕ Look closer' : '⌕ Hide close-ups';
    paint();
  });
  root.querySelectorAll('[data-tv-answer]').forEach(button => button.addEventListener('click', () => {
    const result = answerSizeQuestion(button.dataset.tvAnswer);
    const feedback = get('#tv-feedback');
    feedback.hidden = false;
    feedback.className = `feedback ${result.correct ? 'correct' : 'incorrect'}`;
    feedback.textContent = `${result.correct ? 'Nice work! ' : 'Not quite. '}${result.explanation}`;
  }));
  paint();
}
