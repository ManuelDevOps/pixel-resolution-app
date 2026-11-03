import test from 'node:test';
import assert from 'node:assert/strict';
import { dimensions, imageBytes, pixelCount } from '../src/logic.js';

test('resolution keeps the source aspect ratio', () => {
  assert.deepEqual(dimensions(32, 4, 3), { width: 32, height: 24 });
  assert.deepEqual(dimensions(8, 1, 1), { width: 8, height: 8 });
});
test('uncompressed size uses both dimensions and colour depth', () => {
  assert.equal(imageBytes(32, 24, 24), 2304);
});
test('pixel maths uses width multiplied by height', () => {
  assert.equal(pixelCount(32, 24), 768);
});
