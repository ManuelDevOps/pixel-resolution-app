import test from 'node:test';
import assert from 'node:assert/strict';
import { TV_STANDARDS, pixelTotal, signalFit, answerTvQuestion, screenPhrase } from '../src/tv-lab.js';

test('TV examples use the advertised 16:9 pixel dimensions', () => {
  assert.deepEqual(TV_STANDARDS.hd, { label: 'HD', width: 1280, height: 720 });
  assert.deepEqual(TV_STANDARDS.fhd, { label: 'Full HD', width: 1920, height: 1080 });
  assert.deepEqual(TV_STANDARDS.uhd, { label: '4K UHD', width: 3840, height: 2160 });
});

test('pixel totals compare 4K UHD and Full HD correctly', () => {
  assert.equal(pixelTotal('hd'), 921600);
  assert.equal(pixelTotal('fhd'), 2073600);
  assert.equal(pixelTotal('uhd'), 8294400);
  assert.equal(pixelTotal('uhd') / pixelTotal('fhd'), 4);
});

test('classifies lower, matching and higher resolution sources', () => {
  assert.equal(signalFit('uhd', 'fhd'), 'upscaled');
  assert.equal(signalFit('hd', 'uhd'), 'downscaled');
  assert.equal(signalFit('fhd', 'fhd'), 'matched');
});

test('the TV question rejects invented 4K detail and explains upscaling', () => {
  assert.equal(answerTvQuestion('upscaled').correct, true);
  assert.match(answerTvQuestion('upscaled').explanation, /not automatically recover/i);
  assert.equal(answerTvQuestion('native4k').correct, false);
  assert.equal(answerTvQuestion('no-picture').correct, false);
});

test('screen descriptions use the correct English article', () => {
  assert.equal(screenPhrase('hd'), 'an HD screen');
  assert.equal(screenPhrase('fhd'), 'a Full HD screen');
  assert.equal(screenPhrase('uhd'), 'a 4K UHD screen');
});

test('existing pixel count calculations remain unchanged', () => {
  assert.equal(pixelTotal('hd'), TV_STANDARDS.hd.width * TV_STANDARDS.hd.height);
});
