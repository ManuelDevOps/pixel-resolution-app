import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

test('the footer matches Colour Depth: centred copyright and link at the end of the page content', () => {
  assert.match(html, /<footer class="app-footer"><small>&copy; 2026<\/small> <a href="https:\/\/applications4education\.com\/" target="_blank" rel="noopener noreferrer">Applications 4 Education<\/a><\/footer>\s*<\/main>/);
  assert.equal((html.match(/<footer/g) ?? []).length, 1);
  assert.doesNotMatch(html, /A little curiosity goes a long way\./);
  assert.match(css, /\.app-footer \{ display:flex; justify-content:center; align-items:center; gap:\.35rem; margin-top:1\.25rem; color:#5a189a; font-size:\.9rem; font-weight:650; \}/);
  assert.match(css, /html\[data-theme="cyber"\] \.app-footer \{ color:#9ab4ba; \}/);
  assert.doesNotMatch(css, /(^|[\s,(])footer(\s+span)?[\s,){]/m, 'no rule still targets the old footer element');
});
