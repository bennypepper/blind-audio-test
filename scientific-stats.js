/**
 * ScientificStats — Core Statistics & Scientific Calculation Engine
 * 
 * Provides mathematically exact, numerically stable routines for:
 * 1. Binomial p-values via Lanczos log-gamma and log-binomial expansion.
 * 2. Clopper-Pearson exact confidence intervals and upper bounds via regularized incomplete beta inversion.
 * 3. Holm-Bonferroni multi-testing step-down correction for multi-track batteries.
 * 4. Pre-registration statistics dictionary matching PRD v2 Table A.
 * 5. Response bias detection and standardized scientific reporting verdicts.
 * 
 * Works in Node.js and browser environments (window.ScientificStats).
 */

(function () {
  'use strict';

  // Lanczos gamma coefficients (g=7, n=9)
  const LANCZOS_COEFFS = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.138571095836524,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  const LN_SQRT_2PI = 0.5 * Math.log(2 * Math.PI);

  /**
   * Logarithm of Gamma function ln(Gamma(z)) with Lanczos approximation.
   * Accurate to ~15 decimal places for z > 0.
   */
  function lnGamma(z) {
    if (z <= 0) {
      throw new Error(`lnGamma undefined for non-positive arguments: ${z}`);
    }
    if (z < 0.5) {
      // Euler reflection formula
      return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
    }
    z -= 1;
    let x = LANCZOS_COEFFS[0];
    for (let i = 1; i < LANCZOS_COEFFS.length; i++) {
      x += LANCZOS_COEFFS[i] / (z + i);
    }
    const t = z + 7.5; // g + 0.5
    return LN_SQRT_2PI + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  /**
   * Logarithm of binomial coefficient ln(n choose k).
   */
  function lnComb(n, k) {
    if (k < 0 || k > n) return -Infinity;
    if (k === 0 || k === n) return 0.0;
    return lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1);
  }

  /**
   * Exact upper tail binomial probability P(S >= s) for Binomial(n, p0).
   * @param {number} s - Observed number of successes.
   * @param {number} n - Total number of trials.
   * @param {number} [p0=0.5] - Probability of success under null hypothesis.
   * @returns {number} Exact upper tail p-value.
   */
  function exactBinomialPValue(s, n, p0 = 0.5) {
    if (n <= 0) return 1.0;
    if (s <= 0) return 1.0;
    if (s > n) return 0.0;

    const logP0 = Math.log(p0);
    const log1MinusP0 = Math.log(1 - p0);
    let sum = 0.0;

    for (let k = s; k <= n; k++) {
      const logTerm = lnComb(n, k) + k * logP0 + (n - k) * log1MinusP0;
      sum += Math.exp(logTerm);
    }

    return Math.min(1.0, Math.max(0.0, sum));
  }

  /**
   * Continued fraction evaluation for regularized incomplete beta function (Lentz's method).
   */
  function betacf(a, b, x) {
    const maxIter = 200;
    const eps = 1e-15;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;

    let c = 1.0;
    let d = 1.0 - (qab * x) / qap;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1.0 / d;
    let h = d;

    for (let m = 1; m <= maxIter; m++) {
      const m2 = 2 * m;

      // Even step
      let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1.0 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1.0 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1.0 / d;
      h *= d * c;

      // Odd step
      aa = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1.0 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1.0 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1.0 / d;
      const del = d * c;
      h *= del;

      if (Math.abs(del - 1.0) < eps) break;
    }
    return h;
  }

  /**
   * Regularized incomplete beta function I_x(a, b).
   */
  function incBeta(x, a, b) {
    if (x <= 0.0) return 0.0;
    if (x >= 1.0) return 1.0;

    const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
    const front = Math.exp(Math.log(x) * a + Math.log(1.0 - x) * b - lnBeta);

    // Symmetry transformation for numerical stability
    if (x < (a + 1.0) / (a + b + 2.0)) {
      return (front * betacf(a, b, x)) / a;
    } else {
      return 1.0 - (front * betacf(b, a, 1.0 - x)) / b;
    }
  }

  /**
   * Inverse regularized incomplete beta function (quantile function).
   * Finds x such that I_x(a, b) = p.
   */
  function betaInv(p, a, b) {
    if (p <= 0.0) return 0.0;
    if (p >= 1.0) return 1.0;

    let low = 0.0;
    let high = 1.0;

    // 70 iterations of bisection ensures machine double precision (~1e-21 span)
    for (let i = 0; i < 70; i++) {
      const mid = (low + high) * 0.5;
      if (incBeta(mid, a, b) < p) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) * 0.5;
  }

  /**
   * Exact two-sided Clopper-Pearson confidence interval for binomial proportion.
   * @param {number} s - Number of successes.
   * @param {number} n - Total trials.
   * @param {number} [alpha=0.05] - Significance level (default 0.05 for 95% CI).
   * @returns {{ lower: number, upper: number }}
   */
  function clopperPearsonCI(s, n, alpha = 0.05) {
    if (n <= 0) return { lower: 0.0, upper: 1.0 };

    let lower, upper;
    const halfAlpha = alpha * 0.5;

    if (s === 0) {
      lower = 0.0;
      upper = 1.0 - Math.pow(halfAlpha, 1.0 / n);
    } else if (s === n) {
      lower = Math.pow(halfAlpha, 1.0 / n);
      upper = 1.0;
    } else {
      lower = betaInv(halfAlpha, s, n - s + 1);
      upper = betaInv(1.0 - halfAlpha, s + 1, n - s);
    }

    return {
      lower: Math.max(0.0, Math.min(1.0, lower)),
      upper: Math.max(0.0, Math.min(1.0, upper))
    };
  }

  /**
   * Exact one-sided Clopper-Pearson upper bound for binomial proportion.
   * For null results, gives the upper bound at confidence level (1 - alpha).
   * @param {number} s - Number of successes.
   * @param {number} n - Total trials.
   * @param {number} [alpha=0.05] - Significance level (0.05 for 95% upper bound).
   * @returns {number} Upper bound in [0, 1].
   */
  function clopperPearsonUpperBound(s, n, alpha = 0.05) {
    if (n <= 0) return 1.0;
    if (s === 0) {
      return 1.0 - Math.pow(alpha, 1.0 / n);
    }
    if (s >= n) {
      return 1.0;
    }
    return Math.max(0.0, Math.min(1.0, betaInv(1.0 - alpha, s + 1, n - s)));
  }

  /**
   * Holm-Bonferroni step-down correction across multiple tracks.
   * @param {Array<Object>} trackResults - Array of track trial stats { songId, title, s, n, ... }.
   * @returns {Array<Object>} Updated results with pRaw, pAdjusted, significant, status, rank.
   */
  function holmCorrection(trackResults) {
    if (!Array.isArray(trackResults) || trackResults.length === 0) {
      return [];
    }

    const K = trackResults.length;

    // Attach raw p-values and retain original indices
    const decorated = trackResults.map((item, index) => {
      const s = item.s || 0;
      const n = item.n || 0;
      const pRaw = exactBinomialPValue(s, n, 0.5);
      return {
        original: item,
        origIndex: index,
        s,
        n,
        pRaw
      };
    });

    // Sort ascending by raw p-value
    decorated.sort((a, b) => a.pRaw - b.pRaw);

    // Apply step-down multiplier: p_adj(j) = max_{i<=j} min(1, (K - i + 1) * p(i))
    let maxSoFar = 0.0;
    decorated.forEach((item, j) => {
      const multiplier = K - j;
      const unconstrained = item.pRaw * multiplier;
      maxSoFar = Math.min(1.0, Math.max(maxSoFar, unconstrained));
      item.pAdjusted = maxSoFar;
      item.rank = j + 1;
    });

    // Build final output restored to original order
    const output = new Array(K);
    decorated.forEach(item => {
      const isDescriptiveOnly = item.n <= 5;
      const isSig = !isDescriptiveOnly && item.pAdjusted <= 0.05;
      const status = isDescriptiveOnly
        ? 'descriptive_only'
        : isSig
          ? 'significant'
          : 'not_significant';

      output[item.origIndex] = {
        ...item.original,
        s: item.s,
        n: item.n,
        pRaw: item.pRaw,
        pAdjusted: item.pAdjusted,
        significant: isSig,
        status,
        rank: item.rank
      };
    });

    return output;
  }

  /**
   * Pre-calculated statistics dictionary matching PRD v2 Table A.
   * @param {number} trackCount - Number of tracks K.
   * @param {number} trialsPerTrack - Trials per track T.
   * @returns {{ totalN: number, threshold: number, thresholdPercent: number, trueAlpha: number, trueAlphaPercent: number, minDetectableEffect80: number, minDetectableEffectPercent: number }}
   */
  function getPresetStats(trackCount, trialsPerTrack) {
    const totalN = trackCount * trialsPerTrack;

    // Reference values locked in PRD v2 Table A & specs
    const PRESETS = {
      25: { threshold: 18, trueAlpha: 0.0216, effect: 0.770 },
      40: { threshold: 26, trueAlpha: 0.0385, effect: 0.708 },
      50: { threshold: 32, trueAlpha: 0.0325, effect: 0.685 },
      80: { threshold: 48, trueAlpha: 0.0465, effect: 0.642 },
      100: { threshold: 59, trueAlpha: 0.0443, effect: 0.626 },
      160: { threshold: 92, trueAlpha: 0.0373, effect: 0.601 },
      200: { threshold: 113, trueAlpha: 0.0384, effect: 0.592 }
    };

    if (PRESETS[totalN]) {
      const ref = PRESETS[totalN];
      return {
        totalN,
        threshold: ref.threshold,
        thresholdPercent: Number(((ref.threshold / totalN) * 100).toFixed(1)),
        trueAlpha: ref.trueAlpha,
        trueAlphaPercent: Number((ref.trueAlpha * 100).toFixed(2)),
        minDetectableEffect80: ref.effect,
        minDetectableEffectPercent: Number((ref.effect * 100).toFixed(1))
      };
    }

    // Dynamic fallback for custom totalN
    let threshold = Math.ceil(totalN * 0.5);
    for (let s = Math.ceil(totalN * 0.5); s <= totalN; s++) {
      if (exactBinomialPValue(s, totalN, 0.5) <= 0.05) {
        threshold = s;
        break;
      }
    }
    const trueAlpha = exactBinomialPValue(threshold, totalN, 0.5);

    return {
      totalN,
      threshold,
      thresholdPercent: Number(((threshold / totalN) * 100).toFixed(1)),
      trueAlpha,
      trueAlphaPercent: Number((trueAlpha * 100).toFixed(2)),
      minDetectableEffect80: 0.65, // Conservative estimate if unmapped
      minDetectableEffectPercent: 65.0
    };
  }

  /**
   * Two-sided exact binomial test for response bias against p = 0.5.
   * @param {number} countA - Count of "X is A" responses.
   * @param {number} countB - Count of "X is B" responses.
   * @returns {{ countA: number, countB: number, total: number, propA: number, pValue: number, biased: boolean }}
   */
  function checkResponseBias(countA, countB) {
    const total = countA + countB;
    if (total <= 0) {
      return { countA: 0, countB: 0, total: 0, propA: 0.5, pValue: 1.0, biased: false };
    }

    const propA = countA / total;
    if (countA === countB) {
      return { countA, countB, total, propA, pValue: 1.0, biased: false };
    }

    // Two-sided binomial test under p = 0.5
    const kMin = Math.min(countA, countB);
    let pSum = 0.0;
    for (let k = 0; k <= kMin; k++) {
      pSum += Math.exp(lnComb(total, k) - total * Math.LN2);
    }
    const pValue = Math.min(1.0, 2.0 * pSum);
    const biased = pValue < 0.01;

    return {
      countA,
      countB,
      total,
      propA,
      pValue,
      biased
    };
  }

  /**
   * Formats statistical result verdict following strict scientific conventions.
   * @param {number} s - Number of correct trials.
   * @param {number} n - Total trials.
   * @param {number} pValue - Exact upper tail p-value.
   * @param {{ lower: number, upper: number }|number} ci - Clopper-Pearson CI object or upper bound.
   * @returns {{ detected: boolean, title: string, explanation: string, badgeClass: string }}
   */
  function formatResultVerdict(s, n, pValue, ci) {
    const upperBound = typeof ci === 'number' ? ci : (ci && ci.upper !== undefined ? ci.upper : 1.0);
    const upperPct = (upperBound * 100).toFixed(1);

    if (pValue <= 0.05) {
      const pct = n > 0 ? ((s / n) * 100).toFixed(1) : '0.0';
      const pFmt = pValue < 0.0001 ? '< 0.0001' : pValue.toFixed(4);
      return {
        detected: true,
        title: 'Audible Difference Detected',
        badgeClass: 'badge-success',
        explanation: `Difference detected at N = ${n}, score = ${s}/${n} (${pct}%, p = ${pFmt}). Statistically significant evidence that listener can distinguish between the formats under current conditions.`
      };
    } else {
      return {
        detected: false,
        title: 'Difference Undetected',
        badgeClass: 'badge-neutral',
        explanation: `Difference undetected at N = ${n}, θ ≤ ${upperPct}% (95% confidence upper bound). This indicates that if any perceptual difference exists, it does not exceed this bound under current listening conditions.`
      };
    }
  }

  // Export module interface
  const ScientificStats = {
    lnGamma,
    lnComb,
    exactBinomialPValue,
    incBeta,
    betaInv,
    clopperPearsonCI,
    clopperPearsonUpperBound,
    holmCorrection,
    getPresetStats,
    checkResponseBias,
    formatResultVerdict
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScientificStats;
  }
  if (typeof window !== 'undefined') {
    window.ScientificStats = ScientificStats;
  }
})();
