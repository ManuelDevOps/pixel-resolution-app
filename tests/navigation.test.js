import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const rule = (source, selector) => source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] || '';

test('all workspace navigation shares a centred top row and mobile first row', () => {
  const heading = rule(css, ':is(#explore, #tv-lab, #jumper-lab) .section-heading');
  assert.match(heading, /display:\s*grid\s*;/);
  assert.match(heading, /grid-template-columns:\s*minmax\(0,1fr\) auto minmax\(0,1fr\)\s*;/);
  assert.match(rule(css, ':is(#explore, #tv-lab, #jumper-lab) .section-heading > div:first-child'), /grid-column:\s*1\s*;/);
  const nav = rule(css, ':is(#explore, #tv-lab, #jumper-lab) .mode-nav-row');
  assert.match(nav, /grid-column:\s*2\s*;/);
  assert.match(nav, /align-self:\s*start\s*;/);
  assert.match(rule(css, '#explore .select-label'), /grid-column:\s*3\s*;/);
  assert.match(rule(css, '#explore .select-label'), /justify-self:\s*end\s*(?:;|$)/);
  assert.doesNotMatch(css, /(?:#explore|:is\(#tv-lab, #jumper-lab\)) \.section-heading\s*\{[^}]*grid-template-columns:\s*(?:max-content|minmax\(0,1fr\) auto)/);
  const tablet = css.slice(css.indexOf('@media (max-width:950px)'), css.indexOf('@media (max-width:750px)'));
  assert.match(rule(tablet, '#explore .select-label'), /grid-column:\s*1 \/ -1\s*;/);
  assert.doesNotMatch(rule(tablet, '#explore .section-heading'), /grid-template-columns/);
  const mobileStart = css.indexOf('@media (max-width:750px)');
  const mobile = css.slice(mobileStart, css.indexOf('\n.select-label {', mobileStart));
  assert.match(rule(mobile, ':is(#explore, #tv-lab, #jumper-lab) .section-heading'), /grid-template-columns:\s*minmax\(0,1fr\)/);
  assert.match(rule(mobile, ':is(#explore, #tv-lab, #jumper-lab) .mode-nav-row'), /order:\s*-1\s*;/);
  assert.match(rule(mobile, ':is(#explore, #tv-lab, #jumper-lab) .mode-nav-row'), /grid-column:\s*1 \/ -1\s*;/);
  assert.match(rule(css, '.workspace'), /padding:\s*30px\s*(?:;|$)/);
  const small = css.slice(css.indexOf('@media(max-width:650px)'), css.indexOf('#theme-toggle {'));
  assert.match(rule(small, '.workspace'), /padding:\s*18px\s*(?:;|$)/);
  assert.doesNotMatch(css, /\.tv-workspace\s*\{[^}]*padding\s*:/);
});

test('navigation offers Explore, TV Lab, Jumper Lab in order and no Challenge page', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const buttons = [...html.matchAll(/<nav class="mode-switch"[^>]*>([\s\S]*?)<\/nav>/g)]
    .flatMap(([, content]) => [...content.matchAll(/<button id="([^"]+)"[^>]*>(.*?)<\/button>/g)].map(([, id]) => id));
  assert.deepEqual(buttons, ['explore-tab', 'tv-tab', 'jumper-tab']);
  assert.doesNotMatch(html, /<section id="challenge"\b/);
});

// A small DOM fixture exercises the public buttons and their real parent relationships.
test('mode navigation stays inside each workspace through Explore and lazy lab startup', async () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const elements = new Map();
  const pendingImages = [];
  const element = id => {
    if (!elements.has(id)) {
      const events = {};
      const e = {
        id, hidden: id === 'jumper-lab', value: id === 'resolution' ? '5' : id === 'jumper-motif' ? 'heart' : id === 'jumper-x' || id === 'jumper-y' ? '100' : '0', checked: false,
        textContent: '', dataset: {}, style: {}, width: 640, height: 480, files: [],
        classList: { toggle() {}, add() {}, remove() {} },
        setAttribute(key, value) { this[key] = value; },
        addEventListener(type, fn) { events[type] = fn; },
        click() { events.click?.({ target: this, currentTarget: this }); },
        focus() { globalThis.document.activeElement = this; },
        fire(type) { events[type]?.({ target: this }); },
        append(child) {
          if (child === nav && nav.buttons.includes(globalThis.document?.activeElement)) globalThis.document.activeElement = element('body');
          child.parentElement = this;
        },
        querySelector(selector) { return element(selector === 'option[value="photo"]' ? 'photo-option' : selector === 'option[value="default"]' ? 'default-option' : selector.startsWith('#') ? selector.slice(1) : selector); },
        querySelectorAll() { return []; },
        getContext() { return { drawImage() {}, clearRect() {}, fillRect() {}, save() {}, restore() {}, scale() {}, translate() {}, setTransform() {}, beginPath() {}, arc() {}, ellipse() {}, closePath() {}, fill() {}, clip() {}, quadraticCurveTo() {}, strokeRect() {}, fillText() {}, moveTo() {}, lineTo() {}, stroke() {} }; },
        getBoundingClientRect() { return { width: 700 }; },
      };
      Object.defineProperty(e, 'innerHTML', {
        get() { return this.markup || ''; },
        set(markup) { this.markup = markup; },
      });
      if (id.startsWith('[data-tv-size=') || id === 'jumper-canvas') e.parentElement = { getBoundingClientRect() { return { width: 700 }; } };
      elements.set(id, e);
    }
    return elements.get(id);
  };
  const nav = element('mode-switch');
  nav.contains = child => nav.buttons.includes(child);
  nav.buttons = [...html.matchAll(/<button id="(explore-tab|tv-tab|jumper-tab)"[^>]*>(.*?)<\/button>/g)]
    .map(([, id, label]) => { const button = element(id); button['aria-pressed'] = id === 'explore-tab' ? 'true' : 'false'; button.textContent = label.replace(/<span aria-hidden="true">.*?<\/span>/g, '').replace(/<[^>]*>/g, '').trim(); return button; });
  nav.parentElement = element('header-inner');
  const previous = { document: globalThis.document, window: globalThis.window, Image: globalThis.Image, URL: globalThis.URL };
  globalThis.document = {
    documentElement: element('html'), activeElement: element('body'),
    querySelector(selector) { return selector === '.mode-switch' ? nav : element(selector.slice(1)); },
    createElement() { return element(`offscreen-${Math.random()}`); },
  };
  globalThis.window = { scrollTo() {}, addEventListener() {} };
  globalThis.URL = { createObjectURL() { return 'blob:local'; }, revokeObjectURL() {} };
  globalThis.Image = class {
    set src(value) { this.complete = value.startsWith('data:'); this.naturalWidth = this.complete ? 320 : 0; this.naturalHeight = this.complete ? 240 : 0; if (!this.complete) pendingImages.push(this); }
    addEventListener() {}
  };
  const check = (parent, selected) => {
    assert.equal(nav.parentElement, element(parent), `nav in ${parent}`);
    assert.deepEqual(nav.buttons.map(button => button.textContent.trim()), ['Explore', 'TV Lab', 'Jumper Lab']);
    assert.equal(nav.buttons.filter(button => button['aria-pressed'] === 'true').length, 1);
    assert.equal(element(selected)['aria-pressed'], 'true');
    assert.equal(new Set(nav.buttons).size, 3);
  };
  try {
    assert.equal((html.match(/id="explore-tab"/g) || []).length, 1);
    await import(`../src/app.js?navigation=${Math.random()}`);
    check('explore-nav', 'explore-tab');
    assert.match(element('explore').innerHTML, /Small pixels\.\s*<em>Big picture\.<\/em>/);
    element('image-select').value = '1'; element('image-select').fire('change');
    element('resolution').value = '2'; element('resolution').fire('input');
    element('tv-tab').focus(); element('tv-tab').click(); check('tv-nav', 'tv-tab');
    assert.equal(document.activeElement, element('tv-tab'), 'keyboard activation retains focus after lazy TV navigation move');
    element('explore-tab').focus(); element('explore-tab').click(); check('explore-nav', 'explore-tab');
    assert.equal(document.activeElement, element('explore-tab'), 'keyboard activation retains focus moving back to Explore');
    element('tv-tab').click(); check('tv-nav', 'tv-tab');
    element('[data-tv-stretch="70"]').value = '75'; element('[data-tv-stretch="70"]').fire('input');
    element('explore-tab').click(); check('explore-nav', 'explore-tab');
    element('image-select').focus();
    assert.equal(element('image-select').value, '1');
    assert.equal(element('resolution').value, '2');
    element('tv-tab').click(); check('tv-nav', 'tv-tab');
    assert.equal(document.activeElement, element('image-select'), 'programmatic mode changes do not steal focus from other controls');
    assert.equal(element('[data-tv-stretch="70"]').value, '75');
    element('jumper-tab').focus(); element('jumper-tab').click(); check('jumper-nav', 'jumper-tab');
    assert.equal(document.activeElement, element('jumper-tab'));
    assert.equal(element('jumper-lab').hidden, false);
    element('jumper-motif').value = 'star'; element('jumper-motif').fire('change');
    element('jumper-x').value = '200'; element('jumper-x').fire('input');
    element('explore-tab').click(); check('explore-nav', 'explore-tab');
    assert.equal(element('jumper-lab').hidden, true);
    assert.equal(element('image-select').value, '1');
    assert.equal(element('resolution').value, '2');
    element('tv-tab').click(); check('tv-nav', 'tv-tab');
    assert.equal(element('[data-tv-stretch="70"]').value, '75');
    element('jumper-tab').click(); check('jumper-nav', 'jumper-tab');
    assert.equal(element('jumper-motif').value, 'star');
    assert.equal(element('jumper-x').value, '200');
  } finally { Object.assign(globalThis, previous); }
});
