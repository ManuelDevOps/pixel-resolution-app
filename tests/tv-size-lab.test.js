import test from 'node:test';
import assert from 'node:assert/strict';
import { TV_SIZES, tvWorkingDimensions, hdPhotoDimensions, zoomRect, answerSizeQuestion } from '../src/tv-lab.js';

test('TV sizes represent 32, 45 and 70 inches in proportion', () => {
  assert.deepEqual(TV_SIZES, [32, 45, 70]);
  assert.equal(TV_SIZES[2] / TV_SIZES[0], 70 / 32);
});

test('TV Lab working images are capped at 3840px without upscaling', () => {
  assert.deepEqual(tvWorkingDimensions(4000, 3000), { width: 3840, height: 2880 });
  assert.deepEqual(tvWorkingDimensions(3000, 4000), { width: 2880, height: 3840 });
  assert.deepEqual(tvWorkingDimensions(800, 600), { width: 800, height: 600 });
  assert.equal(tvWorkingDimensions(0, 100), null);
});

test('HD mode fits photos within 1280 × 720 while preserving proportions', () => {
  assert.deepEqual(hdPhotoDimensions(3840, 2160), { width: 1280, height: 720 });
  assert.deepEqual(hdPhotoDimensions(3840, 2880), { width: 960, height: 720 });
  assert.deepEqual(hdPhotoDimensions(400, 300), { width: 400, height: 300 });
  assert.equal(hdPhotoDimensions(0, 100), null);
});

test('the TV size question explains that existing pixels cover more space', () => {
  assert.equal(answerSizeQuestion('same-pixels').correct, true);
  assert.match(answerSizeQuestion('same-pixels').explanation, /same pixels cover more space/i);
  assert.equal(answerSizeQuestion('loses-pixels').correct, false);
  assert.equal(answerSizeQuestion('gains-detail').correct, false);
});

test('equal physical-area magnification exposes fewer source pixels on larger TVs', () => {
  const small = zoomRect(1280, 720, 32);
  const medium = zoomRect(1280, 720, 45);
  const large = zoomRect(1280, 720, 70);
  assert.ok(small.width > medium.width && medium.width > large.width);
  assert.ok(Math.abs(small.width / large.width - 70 / 32) < 1e-10);
  assert.equal(small.x + small.width / 2, large.x + large.width / 2);
  assert.equal(small.y + small.height / 2, large.y + large.height / 2);
});
