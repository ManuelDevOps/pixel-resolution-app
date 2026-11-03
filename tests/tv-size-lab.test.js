import test from 'node:test';
import assert from 'node:assert/strict';
import { TV_SIZES, tvWorkingDimensions, hdPhotoDimensions, answerSizeQuestion, tvBlurPixels } from '../src/tv-lab.js';

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

test('HD detail is shown with a progressively stronger illustrative blur on larger TVs', () => {
  assert.equal(tvBlurPixels(32, 'hd', 3840, 2160), 0);
  assert.ok(tvBlurPixels(45, 'hd', 3840, 2160) > 0);
  assert.ok(tvBlurPixels(70, 'hd', 3840, 2160) > tvBlurPixels(45, 'hd', 3840, 2160));
  assert.equal(tvBlurPixels(70, 'original', 3840, 2160), 0);
  assert.ok(tvBlurPixels(70, 'original', 1280, 720) > 0);
  assert.ok(tvBlurPixels(70, 'original', 720, 1280) > 0);
});

test('equal physical image enlargement has equal blur across screens', () => {
  const amount70 = (45 - 32) / (70 - 32);
  for (const quality of ['hd', 'original']) {
    const width = quality === 'hd' ? 3840 : 1280;
    const height = quality === 'hd' ? 2160 : 720;
    assert.equal(tvBlurPixels(45, quality, width, height, 0), 0);
    assert.equal(tvBlurPixels(70, quality, width, height, 0), 0);
    assert.equal(tvBlurPixels(45, quality, width, height, 1), 1);
    assert.equal(tvBlurPixels(70, quality, width, height, amount70), 1);
    assert.equal(tvBlurPixels(70, quality, width, height, 1), 2.25);
  }
  assert.equal(tvBlurPixels(70, 'original', 3840, 2160, 1), 0);
});

test('the TV size question explains that existing pixels cover more space', () => {
  assert.equal(answerSizeQuestion('same-pixels').correct, true);
  assert.match(answerSizeQuestion('same-pixels').explanation, /same pixels cover more space/i);
  assert.match(answerSizeQuestion('same-pixels').explanation, /stretched/i);
  assert.equal(answerSizeQuestion('loses-pixels').correct, false);
  assert.equal(answerSizeQuestion('gains-detail').correct, false);
});
