import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// A small DOM fixture exercises the public buttons and their real parent relationships.
test('mode navigation stays inside each workspace through game rerenders and lazy TV startup', async () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const elements = new Map();
  const pendingImages = [];
  const element = id => {
    if (!elements.has(id)) {
      const events = {};
      const e = {
        id, hidden: id === 'tv-closeups' || id === 'tv-zoom-note', value: id === 'resolution' ? '5' : '0', checked: false,
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
        querySelectorAll(selector) { return this.id === 'challenge' && selector === '[data-game]' ? [element('guess-game')] : []; },
        getContext() { return { drawImage() {}, clearRect() {}, fillRect() {}, save() {}, restore() {}, scale() {}, setTransform() {}, beginPath() {}, arc() {}, fill() {}, quadraticCurveTo() {}, strokeRect() {}, fillText() {}, moveTo() {}, lineTo() {}, stroke() {} }; },
        getBoundingClientRect() { return { width: 700 }; },
      };
      Object.defineProperty(e, 'innerHTML', {
        get() { return this.markup || ''; },
        set(markup) {
          this.markup = markup;
          if (this === element('challenge') && element('mode-switch').parentElement?.id === 'challenge-nav') element('mode-switch').parentElement = null;
        },
      });
      if (id === 'guess-game') e.dataset.game = 'guess';
      if (id.startsWith('[data-tv-size=')) e.parentElement = { getBoundingClientRect() { return { width: 700 }; } };
      elements.set(id, e);
    }
    return elements.get(id);
  };
  const nav = element('mode-switch');
  nav.contains = child => nav.buttons.includes(child);
  nav.buttons = [...html.matchAll(/<button id="(explore-tab|tv-tab|challenge-tab)"[^>]*>(.*?)<\/button>/g)]
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
    assert.deepEqual(nav.buttons.map(button => button.textContent.trim()), ['Explore', 'TV Lab', 'Challenge']);
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
    element('challenge-tab').focus(); element('challenge-tab').click(); check('challenge-nav', 'challenge-tab');
    assert.equal(document.activeElement, element('challenge-tab'), 'focus follows the same navigation control');
    element('guess-game').click(); check('challenge-nav', 'challenge-tab');
    element('reveal').focus(); element('reveal').click(); check('challenge-nav', 'challenge-tab');
    assert.notEqual(document.activeElement, element('challenge-tab'), 'unrelated game rerenders must not focus navigation');
    element('tv-tab').click(); check('tv-nav', 'tv-tab');
    element('tv-look-closer').click();
    element('[data-tv-stretch="70"]').value = '75'; element('[data-tv-stretch="70"]').fire('input');
    element('explore-tab').click(); check('explore-nav', 'explore-tab');
    element('image-select').focus();
    assert.equal(element('image-select').value, '1');
    assert.equal(element('resolution').value, '2');
    element('challenge-tab').click(); check('challenge-nav', 'challenge-tab');
    assert.equal(document.activeElement, element('image-select'), 'programmatic mode changes do not steal focus from other controls');
    assert.match(element('challenge').innerHTML, /HINTS 1 \/ 2/);
    element('tv-tab').click(); check('tv-nav', 'tv-tab');
    assert.equal(element('tv-closeups').hidden, false);
    assert.equal(element('[data-tv-stretch="70"]').value, '75');
  } finally { Object.assign(globalThis, previous); }
});
