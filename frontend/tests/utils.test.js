import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeFeatures, probabilityPercent } from '../src/utils.js';

test('feature values are sent as numbers and preserve Cleveland category codes', () => {
  const features = encodeFeatures({ age: '52', cp: '4', slope: '3', thal: '7' });
  assert.deepEqual(features, { age: 52, cp: 4, slope: 3, thal: 7 });
});

test('invalid numeric input is rejected before the API request', () => {
  assert.throws(() => encodeFeatures({ age: 'not a number' }), /must be numeric/);
});

test('model probabilities render as whole percentages', () => {
  assert.equal(probabilityPercent(0), 0);
  assert.equal(probabilityPercent(0.0589), 6);
  assert.equal(probabilityPercent(1), 100);
});

test('probabilities outside the model range are rejected', () => {
  assert.throws(() => probabilityPercent(1.2), /between 0 and 1/);
});

