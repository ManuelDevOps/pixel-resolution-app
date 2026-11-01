import test from 'node:test';
import assert from 'node:assert/strict';
import { dimensions, imageBytes, guessPoints, lowestUseful, pixelCount, bestFit } from '../src/logic.js';

test('resolution keeps the source aspect ratio', () => {
  assert.deepEqual(dimensions(32, 4, 3), { width: 32, height: 24 });
  assert.deepEqual(dimensions(8, 1, 1), { width: 8, height: 8 });
});
test('uncompressed size uses both dimensions and colour depth', () => {
  assert.equal(imageBytes(32, 24, 24), 2304);
});
test('guess scoring rewards fewer hints and gives no points for a wrong answer', () => {
  assert.equal(guessPoints(true, 0), 3);
  assert.equal(guessPoints(true, 2), 1);
  assert.equal(guessPoints(false, 0), 0);
});
test('detail challenge accepts only the lowest readable resolution', () => {
  assert.equal(lowestUseful(32, 32), true);
  assert.equal(lowestUseful(64, 32), false);
  assert.equal(lowestUseful(16, 32), false);
});
test('pixel maths uses width multiplied by height', () => {
  assert.equal(pixelCount(32, 24), 768);
});
test('best fit selects an appropriate resolution for the scenario', () => {
  assert.equal(bestFit('icon', 64), true);
  assert.equal(bestFit('icon', 2048), false);
  assert.equal(bestFit('poster', 2048), true);
});
