// Fixture tests. Every expected value has a published reference or an independent scipy/statsmodels computation
// (scripts/reference.py, run 2026-11-02). Sources per value are listed in DATA_SOURCES.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputError, abTest, duration, evanMillerN, exactTest, fisher2x2, fisherRxC, peekingRisk, sampleSize, solveBoundary, twoProportionN } from '../dist/core.js';
import { chiSqSf, crossingProbability, normInv, normSf } from '../dist/stats.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} got ${a}, expected ${b} (tol ${tol})`);
const SS = { mde_type: 'relative', alpha: 0.05, power: 0.8, sided: 'two', variants: 2, bonferroni: false, allocation_ratio: 1 };

test('normal and chi-square functions match scipy to 1e-12', () => {
  close(normInv(0.975), 1.959963984540054, 1e-13, 'norm.ppf(0.975)');
  close(normInv(0.8), 0.8416212335729143, 1e-13, 'norm.ppf(0.8)');
  close(normSf(1.96), 0.024997895148220435, 1e-15, 'norm.sf(1.96)');
  close(normSf(6), 9.865876450376946e-10, 1e-20, 'norm.sf(6)');
  close(chiSqSf(5.965514588770403, 9), 0.7433647250525507, 1e-12, 'chi2.sf(5.9655, 9)');
});

test('sample size 10% -> 12%, 80% power, alpha 0.05 two-sided: 3,841 per arm (raw 3840.847)', () => {
  const r = twoProportionN(0.10, 0.12, 0.05, 0.8, 'two');
  close(r.raw, 3840.847482436276, 1e-6);
  assert.equal(r.n1, 3841);
  const s = sampleSize({ ...SS, baseline_rate: 0.10, mde: 0.02, mde_type: 'absolute' });
  assert.equal(s.sample_size_per_variant, 3841);
  assert.equal(s.total_sample_size, 7682);
});

test('R documentation: power.prop.test(p1 = .50, p2 = .75, power = .90) gives n = 76.7', () => {
  const r = twoProportionN(0.5, 0.75, 0.05, 0.9, 'two');
  close(r.raw, 76.7, 0.05);
  assert.equal(r.n1, 77);
});

test('Evan Miller calculator defaults (20% baseline, 5 points absolute, 80% power, 5% alpha): 1,030', () => {
  assert.equal(Math.round(evanMillerN(0.05, 0.8, 0.2, 0.05)), 1030);
  const s = sampleSize({ ...SS, baseline_rate: 0.2, mde: 0.05, mde_type: 'absolute' });
  assert.equal(s.evan_miller_equivalent, 1030);
  assert.equal(s.sample_size_per_variant, 1094); // pooled formula, scipy: 1093.739 rounded up
  assert.equal(Math.round(evanMillerN(0.05, 0.8, 0.10, 0.01)), 14313); // 10% baseline, 10% relative
});

test('relative MDE, power 0.90, one-sided, unequal allocation and Bonferroni match scipy', () => {
  assert.equal(sampleSize({ ...SS, baseline_rate: 0.05, mde: 0.20, power: 0.9 }).sample_size_per_variant, 10921); // 10920.389
  assert.equal(sampleSize({ ...SS, baseline_rate: 0.20, mde: 0.05, mde_type: 'absolute', sided: 'one' }).sample_size_per_variant, 862); // 861.420
  const k2 = sampleSize({ ...SS, baseline_rate: 0.10, mde: 0.02, mde_type: 'absolute', allocation_ratio: 2 });
  assert.deepEqual([k2.sample_size_control, k2.sample_size_per_variant], [2911, 5822]); // control 2910.513
  const b = sampleSize({ ...SS, baseline_rate: 0.03, mde: 0.10, variants: 4, bonferroni: true });
  assert.equal(b.sample_size_per_variant, 70974); // alpha 0.05/3: 70973.997
  assert.equal(b.total_sample_size, 70974 * 4);
  assert.equal(b.alpha_per_comparison, 0.016667);
});

test('duration: 3,841 per arm, 2 arms, 1,000 visitors/day at 50% share = 15.4 -> 16 days, 3 weeks', () => {
  assert.deepEqual(duration(3841, 2, 1000, 0.5), { total_sample_size: 7682, visitors_per_day_in_test: 500, days_needed: 16, recommended_days: 21, recommended_weeks: 3 });
  assert.equal(duration(1000, 3, 10000, 1).recommended_days, 7);
});

test('two-proportion test 200/1000 vs 250/1000 matches statsmodels and scipy', () => {
  const r = abTest({ control_visitors: 1000, control_conversions: 200, variant_visitors: 1000, variant_conversions: 250, alpha: 0.05, alternative: 'two-sided', expected_split: 0.5 });
  close(r.z_test.z, 2.677397763008329, 1e-6, 'proportions_ztest z');
  close(r.z_test.p_value, 0.007419649261025684, 1e-6, 'proportions_ztest p');
  close(r.chi_square.statistic, 7.168458781362007, 1e-6, 'proportions_chisquare');
  close(r.chi_square_yates.statistic, 6.8845878136200716, 1e-6, 'chi2_contingency correction=True');
  close(r.chi_square_yates.p_value, 0.008694211461790792, 1e-6);
  close(r.fisher_exact.p_value, 0.008649240907370535, 1e-6, 'scipy fisher_exact');
  assert.equal(r.relative_lift, 0.25);
  assert.equal(r.z_test.significant, true);
});

test('one-sided z-test 480/10000 vs 520/10000 (variant greater): z 1.2978, p 0.0972', () => {
  const r = abTest({ control_visitors: 10000, control_conversions: 480, variant_visitors: 10000, variant_conversions: 520, alpha: 0.05, alternative: 'greater', expected_split: 0.5 });
  close(r.z_test.z, 1.2977713690460992, 1e-6);
  close(r.z_test.p_value, 0.0971829554015547, 1e-5); // output p-values carry 4 significant digits
  assert.equal(r.z_test.significant, false);
});

test('sample ratio mismatch: 5,000 vs 5,300 p = 0.003117 (not flagged at 0.001); 5,000 vs 5,500 flagged', () => {
  const base = { control_conversions: 100, variant_conversions: 100, alpha: 0.05, alternative: 'two-sided', expected_split: 0.5 };
  const a = abTest({ ...base, control_visitors: 5000, variant_visitors: 5300 });
  close(a.sample_ratio_mismatch.p_value, 0.0031166938398668707, 1e-6, 'scipy chisquare');
  assert.equal(a.sample_ratio_mismatch.flagged, false);
  assert.equal(abTest({ ...base, control_visitors: 5000, variant_visitors: 5500 }).sample_ratio_mismatch.flagged, true);
});

test('Fisher 2x2: R docs TeaTasting greater p = 0.2429; two-sided 0.4857; Convictions less 0.0004652; [[8,2],[1,5]] 0.03497', () => {
  close(fisher2x2([[3, 1], [1, 3]], 'greater').p_value, 0.24285714285714283, 1e-12);
  close(fisher2x2([[3, 1], [1, 3]], 'two-sided').p_value, 0.48571428571428565, 1e-12);
  close(fisher2x2([[2, 15], [10, 3]], 'less').p_value, 0.00046518094336290503, 1e-12);
  close(fisher2x2([[8, 2], [1, 5]], 'two-sided').p_value, 0.034965034965034975, 1e-12);
  assert.equal(exactTest([[3, 1], [1, 3]], 'greater').odds_ratio, 9);
});

test('Fisher-Freeman-Halton: R docs fisher.test(Job) 4x4 p = 0.7827; chi-square 5.9655 on 9 df (scipy)', () => {
  const job = [[1, 3, 10, 6], [2, 3, 10, 7], [1, 6, 14, 12], [0, 1, 9, 11]];
  const r = exactTest(job, 'two-sided', (t) => fisherRxC(t, 20_000_000));
  assert.equal(r.p_value, 0.7827);
  close(r.chi_square.statistic, 5.965514588770403, 1e-6);
  assert.equal(r.chi_square.df, 9);
  assert.ok(r.chi_square.cells_expected_below_5 > 0);
});

test('Fisher-Freeman-Halton matches brute-force enumeration in Python for 3x3, 2x4 and 3x4 tables', () => {
  close(fisherRxC([[3, 1, 0], [1, 4, 2], [0, 2, 5]]).p_value, 0.04655034507975697, 1e-12);
  close(fisherRxC([[2, 7, 1, 4], [6, 2, 5, 1]]).p_value, 0.0325822228204782, 1e-12);
  close(fisherRxC([[0, 3, 2, 1], [2, 1, 0, 3], [4, 0, 1, 1]]).p_value, 0.08956589628858568, 1e-12);
  // Transposing or dropping an all-zero row does not change the answer.
  close(fisherRxC([[3, 1, 0], [1, 4, 2], [0, 0, 0], [0, 2, 5]]).p_value, 0.04655034507975697, 1e-12);
  close(fisherRxC([[2, 6], [7, 2], [1, 5], [4, 1]]).p_value, 0.0325822228204782, 1e-12);
});

test('r x c table past the work limit returns chi-square and a clear note instead of hanging', () => {
  const job = [[1, 3, 10, 6], [2, 3, 10, 7], [1, 6, 14, 12], [0, 1, 9, 11]];
  const r = exactTest(job, 'two-sided', (t) => fisherRxC(t, 10_000));
  assert.equal(r.p_value, null);
  assert.match(r.note, /work limit/);
  assert.equal(r.chi_square.p_value, 0.7434);
});

test('peeking: false positive rate at 2, 3, 5, 10 looks (Armitage et al. 1969) matches a fine-grid reference', () => {
  const ref = { 2: 0.08311780337300156, 3: 0.10725637466327043, 5: 0.14168933262070427, 10: 0.19335659338547084 };
  for (const [k, v] of Object.entries(ref)) close(peekingRisk(Number(k), 0.05).false_positive_rate, v, 2e-4, `K=${k}`);
  close(crossingProbability([1.959963984540054]), 0.05, 1e-6, 'one look is a plain two-sided test');
});

test('group sequential constants: Pocock 2.178 (K=2), 2.413 (K=5); O\'Brien-Fleming 1.977, 2.040 (Jennison and Turnbull)', () => {
  close(solveBoundary(2, 0.05, 'pocock')[0], 2.178, 2e-3);
  close(solveBoundary(5, 0.05, 'pocock')[0], 2.413, 2e-3);
  close(solveBoundary(2, 0.05, 'obf')[1], 1.977, 2e-3);
  const obf5 = solveBoundary(5, 0.05, 'obf');
  close(obf5[4], 2.040, 2e-3);
  close(obf5[0], 2.040 * Math.sqrt(5), 5e-3); // 4.562 at the first look
});

test('input errors are explained, not thrown as crashes', () => {
  assert.throws(() => sampleSize({ ...SS, baseline_rate: 4.2, mde: 0.1 }), InputError);
  assert.throws(() => sampleSize({ ...SS, baseline_rate: 0.9, mde: 0.2 }), /reaches 100%/);
  assert.throws(() => abTest({ control_visitors: 10, control_conversions: 11, variant_visitors: 10, variant_conversions: 1, alpha: 0.05, alternative: 'two-sided', expected_split: 0.5 }), /cannot exceed/);
  assert.throws(() => exactTest([[1, 2, 3], [4, 5]], 'two-sided'), /same number of columns/);
  assert.throws(() => exactTest([[1, 2, 3], [4, 5, 6]], 'greater'), /2x2/);
});
