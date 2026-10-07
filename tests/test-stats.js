/**
 * Automated Test Suite for ScientificStats Engine
 * Verifies exact numerical accuracy against PRD v2 Table A, B & C reference benchmarks.
 */

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

function approxEqual(actual, expected, tol = 1e-4, msg = '') {
  const diff = Math.abs(actual - expected);
  assert(
    diff <= tol,
    `${msg} Expected ${expected.toFixed(4)}, got ${actual.toFixed(4)} (diff: ${diff.toExponential(3)})`
  );
}

console.log('Running ScientificStats Test Suite...\n');

// -------------------------------------------------------------
// 0. Module Loading & Environment Exports
// -------------------------------------------------------------
console.log('0. Module Exports & Browser Compatibility:');

let stats;
test('Node.js module export loads correctly', () => {
  stats = require('../scientific-stats.js');
  assert(stats !== null && typeof stats === 'object');
  assert.strictEqual(typeof stats.exactBinomialPValue, 'function');
  assert.strictEqual(typeof stats.clopperPearsonCI, 'function');
  assert.strictEqual(typeof stats.clopperPearsonUpperBound, 'function');
  assert.strictEqual(typeof stats.holmCorrection, 'function');
  assert.strictEqual(typeof stats.getPresetStats, 'function');
  assert.strictEqual(typeof stats.checkResponseBias, 'function');
  assert.strictEqual(typeof stats.formatResultVerdict, 'function');
});

test('Browser window.ScientificStats export works in browser context', () => {
  const code = fs.readFileSync(require.resolve('../scientific-stats.js'), 'utf8');
  const windowContext = { window: {} };
  vm.createContext(windowContext);
  vm.runInContext(code, windowContext);
  assert(windowContext.window.ScientificStats !== undefined, 'window.ScientificStats must be defined');
  assert.strictEqual(typeof windowContext.window.ScientificStats.exactBinomialPValue, 'function');
});

// -------------------------------------------------------------
// 1. Exact Binomial P-Values
// -------------------------------------------------------------
console.log('\n1. Exact Binomial P-Values (PRD v2 Table A & Benchmarks):');

test('N=50, S=32 gives p ≈ 0.0325 (Significant, p <= 0.05)', () => {
  const p = stats.exactBinomialPValue(32, 50, 0.5);
  approxEqual(p, 0.0325, 0.0001, 'N=50, S=32');
  assert(p <= 0.05, 'Should be statistically significant');
});

test('N=50, S=31 gives p ≈ 0.0595 (Not significant, p > 0.05)', () => {
  const p = stats.exactBinomialPValue(31, 50, 0.5);
  approxEqual(p, 0.0595, 0.0001, 'N=50, S=31');
  assert(p > 0.05, 'Should not be statistically significant');
});

test('N=100, S=59 gives p ≈ 0.0443 (Significant, p <= 0.05)', () => {
  const p = stats.exactBinomialPValue(59, 100, 0.5);
  approxEqual(p, 0.0443, 0.0001, 'N=100, S=59');
  assert(p <= 0.05, 'Should be statistically significant');
});

test('N=200, S=113 gives p ≈ 0.0384 (Significant, p <= 0.05)', () => {
  const p = stats.exactBinomialPValue(113, 200, 0.5);
  approxEqual(p, 0.0384, 0.0001, 'N=200, S=113');
  assert(p <= 0.05, 'Should be statistically significant');
});

test('Boundary cases: S=0, S=N, S>N, and custom p0', () => {
  assert.strictEqual(stats.exactBinomialPValue(0, 50, 0.5), 1.0);
  assert.strictEqual(stats.exactBinomialPValue(-5, 50, 0.5), 1.0);
  const pAll = stats.exactBinomialPValue(10, 10, 0.5);
  approxEqual(pAll, Math.pow(0.5, 10), 1e-6);
  assert.strictEqual(stats.exactBinomialPValue(51, 50, 0.5), 0.0);

  // 4-choice MUSHRA chance p0 = 0.25 (e.g. 5 out of 10)
  const p4Choice = stats.exactBinomialPValue(5, 10, 0.25);
  // scipy: 1 - binom.cdf(4, 10, 0.25) ≈ 0.0781269
  approxEqual(p4Choice, 0.0781, 0.0002, '4-choice p0=0.25');
});

// -------------------------------------------------------------
// 2. Clopper-Pearson 95% Confidence Intervals
// -------------------------------------------------------------
console.log('\n2. Clopper-Pearson Exact Confidence Intervals:');

test('Clopper-Pearson 95% CI at S=50, N=100 is [0.3983, 0.6017]', () => {
  const ci = stats.clopperPearsonCI(50, 100, 0.05);
  approxEqual(ci.lower, 0.3983, 0.0002, 'CI lower');
  approxEqual(ci.upper, 0.6017, 0.0002, 'CI upper');
});

test('Clopper-Pearson bounds at boundaries S=0 and S=N', () => {
  const ci0 = stats.clopperPearsonCI(0, 50, 0.05);
  assert.strictEqual(ci0.lower, 0);
  approxEqual(ci0.upper, 1 - Math.pow(0.025, 1 / 50), 1e-5);

  const ciN = stats.clopperPearsonCI(50, 50, 0.05);
  approxEqual(ciN.lower, Math.pow(0.025, 1 / 50), 1e-5);
  assert.strictEqual(ciN.upper, 1.0);
});

test('Clopper-Pearson one-sided 95% upper bound for null result S=25, N=50 is ≈ 0.6238 (<= 62.4%)', () => {
  const ub = stats.clopperPearsonUpperBound(25, 50, 0.05);
  approxEqual(ub, 0.6238, 0.0005, 'Upper bound');
  assert(ub <= 0.624, 'Upper bound should be <= 62.4%');
});

test('Clopper-Pearson one-sided 95% upper bound for null result S=50, N=100 is ≈ 0.5866 (<= 58.7%)', () => {
  const ub = stats.clopperPearsonUpperBound(50, 100, 0.05);
  approxEqual(ub, 0.5866, 0.0005, 'Upper bound N=100');
  assert(ub <= 0.587, 'Upper bound should be <= 58.7%');
});

// -------------------------------------------------------------
// 3. Holm-Bonferroni Multi-Track Correction
// -------------------------------------------------------------
console.log('\n3. Holm-Bonferroni Multi-Testing Correction:');

test('Holm step-down ordering and adjustments', () => {
  const trackResults = [
    { songId: 'song1', title: 'Track 1', s: 18, n: 20 }, // p raw very small (~0.000201)
    { songId: 'song2', title: 'Track 2', s: 10, n: 20 }, // p raw ~ 0.588
    { songId: 'song3', title: 'Track 3', s: 15, n: 20 }, // p raw ~ 0.0207
    { songId: 'song4', title: 'Track 4', s: 13, n: 20 }, // p raw ~ 0.1316
    { songId: 'song5', title: 'Track 5', s: 16, n: 20 }  // p raw ~ 0.0059
  ];

  const adjusted = stats.holmCorrection(trackResults);
  assert.strictEqual(adjusted.length, 5);

  // Check that all original keys and original ordering are preserved
  assert.strictEqual(adjusted[0].songId, 'song1');
  assert.strictEqual(adjusted[1].songId, 'song2');
  assert.strictEqual(adjusted[2].songId, 'song3');
  assert.strictEqual(adjusted[3].songId, 'song4');
  assert.strictEqual(adjusted[4].songId, 'song5');

  // Verify that adjusted p-values are monotonic when ordered by raw p-value
  const sorted = [...adjusted].sort((a, b) => a.pRaw - b.pRaw);
  for (let i = 1; i < sorted.length; i++) {
    assert(
      sorted[i].pAdjusted >= sorted[i - 1].pAdjusted - 1e-9,
      `Adjusted p-values must be non-decreasing: ${sorted[i - 1].pAdjusted} vs ${sorted[i].pAdjusted}`
    );
  }

  // Track 1: s=18/20 (pRaw ≈ 0.000201). For K=5, pAdj = 5 * 0.000201 ≈ 0.0010 <= 0.05
  const t1 = adjusted.find(t => t.songId === 'song1');
  assert(t1.significant, 'Track 1 with 18/20 should be significant');
  assert.strictEqual(t1.status, 'significant');
  assert.strictEqual(t1.rank, 1);

  // Track 2: s=10/20 (pRaw ≈ 0.588) -> not significant
  const t2 = adjusted.find(t => t.songId === 'song2');
  assert(!t2.significant, 'Track 2 with 10/20 should not be significant');
  assert.strictEqual(t2.status, 'not_significant');
});

test('Holm correction marks T=5 trials as descriptive_only', () => {
  const trackResults = [
    { songId: 'song1', s: 5, n: 5 },
    { songId: 'song2', s: 4, n: 5 },
    { songId: 'song3', s: 3, n: 5 }
  ];

  const adjusted = stats.holmCorrection(trackResults);
  adjusted.forEach(t => {
    assert.strictEqual(t.status, 'descriptive_only', 'T=5 trials must be marked descriptive_only');
    assert.strictEqual(t.significant, false, 'T=5 trials cannot achieve statistical significance');
  });
});

test('Holm correction handles empty array gracefully', () => {
  assert.deepStrictEqual(stats.holmCorrection([]), []);
});

// -------------------------------------------------------------
// 4. Pre-Registration Statistics Dictionary (PRD Table A)
// -------------------------------------------------------------
console.log('\n4. Pre-Registration Presets (PRD v2 Table A):');

const presetCases = [
  { k: 5, t: 5, totalN: 25, threshold: 18, alpha: 0.0216, effect: 0.770 },
  { k: 10, t: 5, totalN: 50, threshold: 32, alpha: 0.0325, effect: 0.685 },
  { k: 5, t: 10, totalN: 50, threshold: 32, alpha: 0.0325, effect: 0.685 },
  { k: 8, t: 5, totalN: 40, threshold: 26, alpha: 0.0385, effect: 0.708 },
  { k: 8, t: 10, totalN: 80, threshold: 48, alpha: 0.0465, effect: 0.642 },
  { k: 10, t: 10, totalN: 100, threshold: 59, alpha: 0.0443, effect: 0.626 },
  { k: 5, t: 20, totalN: 100, threshold: 59, alpha: 0.0443, effect: 0.626 },
  { k: 8, t: 20, totalN: 160, threshold: 92, alpha: 0.0373, effect: 0.601 },
  { k: 10, t: 20, totalN: 200, threshold: 113, alpha: 0.0384, effect: 0.592 }
];

presetCases.forEach(c => {
  test(`Preset K=${c.k}, T=${c.t} (N=${c.totalN}) -> threshold ${c.threshold}, alpha ${c.alpha}`, () => {
    const s = stats.getPresetStats(c.k, c.t);
    assert.strictEqual(s.totalN, c.totalN);
    assert.strictEqual(s.threshold, c.threshold);
    approxEqual(s.trueAlpha, c.alpha, 0.0002, `alpha for N=${c.totalN}`);
    approxEqual(s.minDetectableEffect80, c.effect, 0.001, `effect for N=${c.totalN}`);
  });
});

test('Dynamic calculation for unlisted preset K=6, T=10 (N=60)', () => {
  const s = stats.getPresetStats(6, 10);
  assert.strictEqual(s.totalN, 60);
  assert(s.threshold > 30, 'Threshold should be above chance');
  assert(s.trueAlpha <= 0.05, 'True alpha should be <= 0.05');
});

// -------------------------------------------------------------
// 5. Response Bias Check
// -------------------------------------------------------------
console.log('\n5. Response Bias Detection (PRD Table C):');

test('Balanced choices produce p=1.0 and biased=false', () => {
  const res = stats.checkResponseBias(25, 25);
  assert.strictEqual(res.total, 50);
  assert.strictEqual(res.biased, false);
  approxEqual(res.pValue, 1.0, 1e-4);
});

test('Extreme imbalance flags biased=true (p < 0.01)', () => {
  // CountA = 40, CountB = 10 (N=50) -> two-sided binomial p is ~ 0.000024 < 0.01
  const res = stats.checkResponseBias(40, 10);
  assert.strictEqual(res.total, 50);
  assert.strictEqual(res.biased, true);
  assert(res.pValue < 0.01);
});

test('Moderate variation remains unbiased (p >= 0.01)', () => {
  // CountA = 28, CountB = 22 (N=50)
  const res = stats.checkResponseBias(28, 22);
  assert.strictEqual(res.biased, false);
  assert(res.pValue >= 0.01);
});

test('Zero choices handled gracefully without division by zero', () => {
  const res = stats.checkResponseBias(0, 0);
  assert.strictEqual(res.total, 0);
  assert.strictEqual(res.biased, false);
  assert.strictEqual(res.pValue, 1.0);
});

// -------------------------------------------------------------
// 6. Result Verdict Formatter
// -------------------------------------------------------------
console.log('\n6. Result Verdict Formatter:');

test('Statistically significant result formatted correctly', () => {
  const ci = { lower: 0.58, upper: 0.82 };
  const verdict = stats.formatResultVerdict(35, 50, 0.0033, ci);
  assert.strictEqual(verdict.detected, true);
  assert.strictEqual(verdict.title, 'Audible Difference Detected');
  assert(verdict.badgeClass.includes('success'));
  assert(verdict.explanation.length > 0);
});

test('Undetected result strictly formatted per scientific convention', () => {
  const ci = { lower: 0.38, upper: 0.624 };
  const verdict = stats.formatResultVerdict(25, 50, 0.556, ci);
  assert.strictEqual(verdict.detected, false);
  assert.strictEqual(verdict.title, 'Difference Undetected');
  const expectedText = 'Difference undetected at N = 50, θ ≤ 62.4% (95% confidence upper bound). This indicates that if any perceptual difference exists, it does not exceed this bound under current listening conditions.';
  assert.strictEqual(verdict.explanation, expectedText);
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n---------------------------------------------');
console.log(`Tests finished: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed successfully!');
}
