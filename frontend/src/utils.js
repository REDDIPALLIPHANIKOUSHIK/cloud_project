/** Convert HTML input strings to the numeric feature values expected by the API. */
export function encodeFeatures(fields) {
  return Object.fromEntries(Object.entries(fields).map(([name, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new TypeError(`Feature ${name} must be numeric`);
    return [name, numeric];
  }));
}

/** Display a model probability as an integer percentage. */
export function probabilityPercent(probability) {
  const value = Number(probability);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError('Probability must be between 0 and 1');
  }
  return Math.round(value * 100);
}

