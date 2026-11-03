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
    explanation: 'When stretched to fill the larger TV, the same pixels cover more space, so they may be easier to notice at the same viewing distance.',
  };
}

export const TV_SIZES = [32, 45, 70];
// Screen resolution shown under each TV: HD 720p, Full HD and 4K UHD.
const TV_PANELS = { 32: TV_STANDARDS.hd, 45: TV_STANDARDS.fhd, 70: TV_STANDARDS.uhd };

export function tvBlurPixels(diagonal, quality, width, height, stretch = 1) {
  const hdSized = Math.max(width, height) <= 1280 && Math.min(width, height) <= 720;
  if (quality !== 'hd' && !hdSized) return 0;
  const enlargement = Math.max(0, diagonal - 32) * stretch;
  if (enlargement <= 13) return enlargement / 13;
  return 1 + (enlargement - 13) * 1.25 / 25;
}

export const tvWorkingDimensions = (width, height) => workingDimensions(width, height, 3840);

function is4k(width, height) {
  return Math.max(width, height) >= 3840 && Math.min(width, height) >= 2160;
}

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

function drawTvImage(canvas, image, diagonal, zoomed, stretch = 1) {
  const frame = virtualFrame(image);
  const rect = zoomed ? zoomRect(frame.width, frame.height, diagonal) : { x: 0, y: 0, width: frame.width, height: frame.height };
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#28293a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.imageSmoothingEnabled = !zoomed;
  const fraction = zoomed ? 1 : (32 + (diagonal - 32) * stretch) / diagonal;
  const scaleX = canvas.width * fraction / rect.width;
  const scaleY = canvas.height * fraction / rect.height;
  const offsetX = canvas.width * (1 - fraction) / 2;
  const offsetY = canvas.height * (1 - fraction) / 2;
  ctx.setTransform(scaleX, 0, 0, scaleY, offsetX - rect.x * scaleX, offsetY - rect.y * scaleY);
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
  const stretch = { 32: 0, 45: 0, 70: 0 };

  root.innerHTML = `
    <div class="hero"><div><span class="eyebrow"><span>✳</span> TV SIZE LAB</span><h1 id="tv-title">One image. <em>Three TV sizes.</em></h1><p>Explore how image resolution can look different as the screen gets bigger.</p></div></div>
    <div class="workspace tv-workspace">
      <div class="section-heading"><div><span class="step-label">01 / YOUR IMAGE</span><h2>Choose an image <span>✳</span></h2><p>Upload once to show the same picture on all three TVs.</p></div><div id="tv-nav" class="mode-nav-row"></div></div>
      <div id="tv-drop-zone" class="upload-zone"><label for="tv-photo-input">Drag and drop the image here</label><span>or</span><input id="tv-photo-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose an image for TV Lab"><p>JPEG, PNG or WebP · up to 100 MB · stays in your browser · original file unchanged</p><p id="tv-photo-error" class="upload-error" role="alert" aria-live="polite"></p></div>
      <p id="tv-image-info" class="sr-only" aria-live="polite"></p>
      <div class="tv-size-screens">${TV_SIZES.map(diagonal => `<figure class="tv-size-screen" style="--diagonal:${diagonal};--screen-width:${diagonal / 70 * 100}%"><div class="tv-photo-frame"><div class="tv-size-bezel"><canvas width="640" height="360" data-tv-size="${diagonal}" aria-label="Simulated ${diagonal}-inch television"></canvas>${diagonal === 32 ? '' : `<div class="tv-stretch-handle" data-tv-handle="${diagonal}" aria-hidden="true"></div>`}</div></div><figcaption>${diagonal}″ <span>TV</span><small class="tv-resolution">${TV_PANELS[diagonal].width} × ${TV_PANELS[diagonal].height}</small></figcaption>${diagonal === 32 ? '<div class="tv-stretch-spacer" aria-hidden="true"></div>' : `<label class="tv-stretch-label">Stretch image on ${diagonal}-inch TV<input type="range" min="0" max="100" value="0" data-tv-stretch="${diagonal}" aria-label="Stretch image on ${diagonal}-inch TV"></label>`}</figure>`).join('')}</div>
      <div class="tv-tools"><button id="tv-look-closer" class="hint-button" aria-pressed="false">⌕ Look closer</button><p>The TVs are shown in proportion. They are simulations, not actual physical sizes.</p></div>
      <div id="tv-closeups" class="tv-closeups" hidden>${TV_SIZES.map(diagonal => `<figure><canvas width="640" height="360" data-tv-zoom="${diagonal}" aria-label="Magnified centre of ${diagonal}-inch television"></canvas><figcaption>${diagonal}″ TV</figcaption></figure>`).join('')}</div>
      <p id="tv-zoom-note" class="tv-note" hidden>The close-ups show the same physical area centred on the same detail. They match at the starting size and reveal fewer source pixels as you stretch each image. Close-ups omit the added blur.</p>
      <div class="tv-fact"><span>✳</span><div><strong>Same image, stretched wider.</strong><p>Stretching does not remove pixels or add detail. Existing pixels cover more space and may be easier to notice at the same viewing distance.</p></div></div>
    </div>
    <div class="workspace tv-quiz"><span class="step-label">02 / TRY IT</span><h2>Put it to the test <span>✳</span></h2><p>An HD image fills a 32″ TV, then is stretched to fill the 70″ TV at the same distance. What changes?</p><div class="tv-answers"><button data-tv-answer="loses-pixels">Stretching removes pixels from the image.</button><button data-tv-answer="same-pixels">The same pixels cover more space when stretched.</button><button data-tv-answer="gains-detail">Stretching automatically adds detail to the image.</button></div><div id="tv-feedback" class="feedback" role="status" aria-live="polite" hidden></div></div>`;

  const get = selector => root.querySelector(selector);
  const releaseUrl = () => {
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    pendingUrl = null;
  };
  const paint = () => {
    if (quality === 'hd' && !hdImage) hdImage = makeHdImage(original);
    const image = quality === 'hd' ? hdImage : original;
    for (const diagonal of TV_SIZES) {
      const screen = get(`[data-tv-size="${diagonal}"]`);
      const amount = stretch[diagonal];
      // Only reallocate when the layout, DPR or chosen image detail changes.
      const bounds = virtualFrame(image);
      const layout = screen.parentElement.getBoundingClientRect();
      const dpr = Math.min(3, Math.max(1, globalThis.window?.devicePixelRatio || 1));
      if (layout.width > 0) {
        const width = Math.max(1, Math.min(3840, Math.ceil(bounds.width), Math.round(layout.width * dpr)));
        const height = Math.max(1, Math.min(2160, Math.ceil(bounds.height), Math.round(width * 9 / 16)));
        if (screen.width !== width || screen.height !== height) {
          screen.width = width;
          screen.height = height;
        }
      }
      drawTvImage(screen, image, diagonal, false, amount);
      const blur = tvBlurPixels(diagonal, quality, original.width, original.height, amount);
      screen.style.filter = blur ? `blur(${blur}px)` : 'none';
      if (diagonal !== 32) {
        get(`[data-tv-stretch="${diagonal}"]`).value = String(Math.round(amount * 100));
        const fraction = (32 + (diagonal - 32) * amount) / diagonal;
        get(`[data-tv-handle="${diagonal}"]`).style.left = `clamp(11px, ${(1 + fraction) * 50}%, calc(100% - 11px))`;
        get(`[data-tv-handle="${diagonal}"]`).style.top = `clamp(11px, ${(1 + fraction) * 50}%, calc(100% - 11px))`;
      }
      if (!get('#tv-closeups').hidden) drawTvImage(get(`[data-tv-zoom="${diagonal}"]`), image, 32 + (diagonal - 32) * amount, true);
    }
    get('#tv-image-info').textContent = `${imageDescription}. ${quality === 'hd' ? `Automatic HD simulation: ${image.width.toLocaleString('en-GB')} × ${image.height.toLocaleString('en-GB')} px of image detail (maximum 1280 × 720). Stretching adds illustrative blur; smaller images are not enhanced.` : 'Automatic 4K or higher: full working-image detail, no artificial blur when stretched.'}`;
  };
  const loadPhoto = file => {
    const error = get('#tv-photo-error');
    error.textContent = validatePhoto(file);
    // A rejected file starts no decode, so it must not cancel a load in progress.
    if (error.textContent) return;
    const id = ++requestId;
    releaseUrl();
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
          const previous = { original, hdImage, imageDescription, quality, stretch45: stretch[45], stretch70: stretch[70] };
          try {
            original = working;
            hdImage = null;
            quality = is4k(image.naturalWidth, image.naturalHeight) ? 'original' : 'hd';
            const dimensions = (width, height) => `${width.toLocaleString('en-GB')} × ${height.toLocaleString('en-GB')} px`;
            imageDescription = `Source image: ${dimensions(image.naturalWidth, image.naturalHeight)}. Working image: ${dimensions(size.width, size.height)}${size.width !== image.naturalWidth || size.height !== image.naturalHeight ? ' (resized for TV Lab)' : ''}`;
            stretch[45] = stretch[70] = 0;
            paint();
          } catch (renderError) {
            ({ original, hdImage, imageDescription, quality } = previous);
            stretch[45] = previous.stretch45;
            stretch[70] = previous.stretch70;
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
  for (const diagonal of [45, 70]) {
    const slider = get(`[data-tv-stretch="${diagonal}"]`);
    slider.addEventListener('input', () => {
      stretch[diagonal] = Math.max(0, Math.min(1, Number(slider.value) / 100));
      paint();
    });
    const handle = get(`[data-tv-handle="${diagonal}"]`);
    const bezel = get(`[data-tv-size="${diagonal}"]`).parentElement;
    let drag = null;
    handle.addEventListener('pointerdown', event => {
      drag = { id: event.pointerId, x: event.clientX, amount: stretch[diagonal] };
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const width = bezel.getBoundingClientRect().width;
      stretch[diagonal] = Math.max(0, Math.min(1, drag.amount + (event.clientX - drag.x) * 2 * diagonal / ((diagonal - 32) * width)));
      paint();
    });
    const endDrag = event => { if (drag?.id === event.pointerId) drag = null; };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
    handle.addEventListener('lostpointercapture', endDrag);
  }
  // Recover zero-size hidden layouts when the tab is shown, and DPR/layout changes on resize.
  if (typeof window !== 'undefined') window.addEventListener('resize', paint);
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => { if (!root.hidden) paint(); });
    observer.observe(root, { attributes: true, attributeFilter: ['hidden'] });
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
  // Decode the repository image independently of Explore and preserve any user upload.
  const included = new Image();
  included.onload = () => {
    if (requestId !== 0) return;
    try {
      const size = tvWorkingDimensions(included.naturalWidth, included.naturalHeight);
      if (!size) return;
      const previous = { original, hdImage, quality, imageDescription };
      try {
        const working = document.createElement('canvas');
        working.width = size.width;
        working.height = size.height;
        working.getContext('2d').drawImage(included, 0, 0, size.width, size.height);
        original = working;
        hdImage = null;
        quality = 'hd';
        imageDescription = `Included landscape: ${size.width.toLocaleString('en-GB')} × ${size.height.toLocaleString('en-GB')} px`;
        paint();
      } catch {
        ({ original, hdImage, quality, imageDescription } = previous);
        paint();
      }
    } catch { /* Keep the interactive example if the included image cannot be drawn. */ }
  };
  included.onerror = () => { /* Keep the interactive example if the asset is unavailable. */ };
  included.src = '/assets/landscape-720p.png';
}
