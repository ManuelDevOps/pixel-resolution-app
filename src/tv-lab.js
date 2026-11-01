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

const ids = ['hd', 'fhd', 'uhd'];
const number = value => value.toLocaleString('en-GB');
const size = id => `${number(TV_STANDARDS[id].width)} × ${number(TV_STANDARDS[id].height)}`;

// A generated high-detail frame makes the same source available offline at every resolution.
function drawFrame(ctx, width, height) {
  ctx.save();
  ctx.scale(width / 960, height / 540);
  ctx.fillStyle = '#bfe7ed'; ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(750, 110, 54, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8299c4'; ctx.beginPath(); ctx.moveTo(0, 415); ctx.lineTo(250, 115); ctx.lineTo(450, 395); ctx.lineTo(640, 180); ctx.lineTo(960, 435); ctx.lineTo(960, 540); ctx.lineTo(0, 540); ctx.fill();
  ctx.fillStyle = '#f9f6ef'; ctx.beginPath(); ctx.moveTo(188, 190); ctx.lineTo(250, 115); ctx.lineTo(316, 207); ctx.lineTo(265, 181); ctx.lineTo(237, 198); ctx.lineTo(218, 185); ctx.fill();
  ctx.fillStyle = '#77ad99'; ctx.beginPath(); ctx.moveTo(0, 410); ctx.quadraticCurveTo(240, 320, 480, 430); ctx.quadraticCurveTo(730, 350, 960, 410); ctx.lineTo(960, 540); ctx.lineTo(0, 540); ctx.fill();
  ctx.fillStyle = '#4d7d70'; ctx.fillRect(0, 490, 960, 50);
  ctx.fillStyle = '#4a4d63'; ctx.fillRect(618, 292, 10, 150);
  ctx.fillStyle = '#fff7e8'; ctx.fillRect(545, 245, 156, 72);
  ctx.strokeStyle = '#4a4d63'; ctx.lineWidth = 4; ctx.strokeRect(545, 245, 156, 72);
  ctx.fillStyle = '#34394e'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PIXEL PARK', 623, 275);
  ctx.font = '14px sans-serif'; ctx.fillText('LOOK CLOSER', 623, 297);
  ctx.strokeStyle = '#34394e'; ctx.lineWidth = 0.8;
  for (let i = 0; i < 28; i++) { ctx.beginPath(); ctx.moveTo(550 + i * 5.2, 304); ctx.lineTo(550 + i * 5.2, 311); ctx.stroke(); }
  ctx.restore();
}

function createSource(id) {
  const canvas = document.createElement('canvas');
  const standard = TV_STANDARDS[id];
  canvas.width = standard.width;
  canvas.height = standard.height;
  drawFrame(canvas.getContext('2d'), canvas.width, canvas.height);
  return canvas;
}

function paintScreens(root, sourceId, zoomed) {
  const source = createSource(sourceId);
  const panel = document.createElement('canvas');
  for (const id of ids) {
    const standard = TV_STANDARDS[id];
    panel.width = standard.width;
    panel.height = standard.height;
    const panelContext = panel.getContext('2d');
    panelContext.imageSmoothingEnabled = true;
    panelContext.drawImage(source, 0, 0, panel.width, panel.height);
    const canvas = root.querySelector(`[data-screen-canvas="${id}"]`);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    if (zoomed) {
      // Inspect the same small part of the frame on each virtual panel.
      ctx.drawImage(panel, panel.width * 0.59, panel.height * 0.46, panel.width * 0.12, panel.height * 0.12, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(panel, 0, 0, canvas.width, canvas.height);
    }
  }
}

function signalExplanation(screen, source) {
  const fit = signalFit(screen, source);
  const tv = TV_STANDARDS[screen].label;
  const video = TV_STANDARDS[source].label;
  if (fit === 'upscaled') return `${video} video has fewer pixels than this ${tv} screen. The TV upscales it to fit, but cannot automatically recover details missing from the source.`;
  if (fit === 'downscaled') return `${video} video has more pixels than this ${tv} screen. The image is scaled down to fit, so the screen cannot display all source pixels at once.`;
  return `${video} video and this ${tv} screen have the same pixel dimensions, so no resolution scaling is needed to fit the frame.`;
}

export function initTvLab(root) {
  let screen = 'uhd';
  let source = 'fhd';
  let zoomed = false;
  root.innerHTML = `
    <div class="challenge-intro"><span class="eyebrow"><span>✳</span> TV RESOLUTION LAB</span><h1 id="tv-title">A closer look at <em>TV pixels.</em></h1><p>Compare three TV screens, then change the video source to see how they work together.</p></div>
    <div class="workspace tv-workspace">
      <div class="section-heading"><div><span class="step-label">01 / COMPARE</span><h2>Three screens. One scene. <span>✳</span></h2><p>Choose a TV screen to explore its relationship with the video.</p></div><label class="select-label">VIDEO SOURCE <select id="tv-source"><option value="hd">HD · 1280 × 720</option><option value="fhd" selected>Full HD · 1920 × 1080</option><option value="uhd">4K UHD · 3840 × 2160</option></select></label></div>
      <div class="tv-screens">${ids.map(id => `<button class="tv-card ${id === screen ? 'selected' : ''}" data-tv-screen="${id}" aria-pressed="${id === screen}"><span class="tv-card-heading">${TV_STANDARDS[id].label}<span>${id === screen ? 'SELECTED' : 'SELECT'}</span></span><span class="tv-bezel"><canvas width="640" height="360" data-screen-canvas="${id}" aria-label="Simulated ${TV_STANDARDS[id].label} screen"></canvas></span><span class="tv-resolution">${size(id)} px</span><span class="tv-pixels">${number(pixelTotal(id))} pixels</span></button>`).join('')}</div>
      <div class="tv-tools"><button id="tv-zoom" class="hint-button" aria-pressed="false">⌕ Magnify detail</button><p>All screens show the same frame at the same display size. This is a simulation, not a 1:1 display of TV pixels.</p></div>
      <div class="tv-fact"><span>✳</span><div><strong>4K UHD has 4 times as many pixels as Full HD.</strong><p>3840 × 2160 = 8,294,400 pixels; 1920 × 1080 = 2,073,600 pixels.</p></div></div>
      <div class="tv-signal" aria-live="polite"><span class="step-label">SCREEN + SOURCE</span><h3 id="tv-signal-title"></h3><p id="tv-signal-description"></p></div>
      <p class="tv-note">HD here uses 1280 × 720 as an example. Resolution is only one part of picture quality. The image represents a video frame.</p>
    </div>
    <div class="workspace tv-quiz"><span class="step-label">02 / TRY IT</span><h2>Put it to the test <span>✳</span></h2><p>You have a 4K UHD TV, but your video is Full HD. Which statement is correct?</p><div class="tv-answers"><button data-tv-answer="native4k">The video automatically gains all the detail of native 4K.</button><button data-tv-answer="upscaled">The TV scales the image to fit, but cannot automatically restore missing detail.</button><button data-tv-answer="no-picture">The TV cannot show the video at all.</button></div><div id="tv-feedback" class="feedback" role="status" aria-live="polite" hidden></div></div>`;

  const updateSelection = () => {
    root.querySelectorAll('[data-tv-screen]').forEach(button => {
      const selected = button.dataset.tvScreen === screen;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.querySelector('.tv-card-heading span').textContent = selected ? 'SELECTED' : 'SELECT';
    });
    root.querySelector('#tv-signal-title').textContent = `${TV_STANDARDS[source].label} video on ${screenPhrase(screen)}`;
    root.querySelector('#tv-signal-description').textContent = signalExplanation(screen, source);
  };
  root.querySelectorAll('[data-tv-screen]').forEach(button => button.addEventListener('click', () => {
    screen = button.dataset.tvScreen;
    updateSelection();
  }));
  root.querySelector('#tv-source').addEventListener('change', event => {
    source = event.target.value;
    paintScreens(root, source, zoomed);
    updateSelection();
  });
  root.querySelector('#tv-zoom').addEventListener('click', event => {
    zoomed = !zoomed;
    event.currentTarget.setAttribute('aria-pressed', String(zoomed));
    event.currentTarget.textContent = zoomed ? '⌕ Show whole image' : '⌕ Magnify detail';
    paintScreens(root, source, zoomed);
  });
  root.querySelectorAll('[data-tv-answer]').forEach(button => button.addEventListener('click', () => {
    const result = answerTvQuestion(button.dataset.tvAnswer);
    const feedback = root.querySelector('#tv-feedback');
    feedback.hidden = false;
    feedback.className = `feedback ${result.correct ? 'correct' : 'incorrect'}`;
    feedback.textContent = `${result.correct ? 'Nice work! ' : 'Not quite. '}${result.explanation}`;
  }));
  paintScreens(root, source, zoomed);
  updateSelection();
}
