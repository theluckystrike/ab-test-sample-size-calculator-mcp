# Independent reference values for test/core.test.mjs, computed with scipy/statsmodels (no code shared with src/).
# Run: python3 scripts/reference.py   (scipy 1.13.1, statsmodels 0.14.6 on 2026-11-02)
import itertools, math, json
import numpy as np
from scipy import stats
from statsmodels.stats.proportion import proportions_ztest, proportions_chisquare

out = {}
z = stats.norm.ppf
# Sample size, two proportions, pooled H0 / unpooled H1 (R power.prop.test closed form)
def n_pp(p1, p2, alpha=0.05, power=0.8, sided=2, k=1.0):
    za, zb = z(1 - alpha / sided), z(power)
    pb = (p1 + k * p2) / (1 + k)
    return (za * math.sqrt(pb * (1 - pb) * (1 + 1 / k)) + zb * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2) / k)) ** 2 / (p2 - p1) ** 2
out['n_10_12'] = n_pp(0.10, 0.12)
out['n_05_06_rel20_90'] = n_pp(0.05, 0.06, power=0.9)
out['n_20_25_one'] = n_pp(0.20, 0.25, sided=1)
out['n_20_25'] = n_pp(0.20, 0.25)
out['n_10_12_k2'] = n_pp(0.10, 0.12, k=2)
out['n_03_033_bonf3'] = n_pp(0.03, 0.033, alpha=0.05 / 3)
# Evan Miller formula
def em(alpha, power, p, d):
    if p > 0.5: p = 1 - p
    a, b = z(1 - alpha / 2), z(power)
    return (a * math.sqrt(2 * p * (1 - p)) + b * math.sqrt(p * (1 - p) + (p + d) * (1 - p - d))) ** 2 / d ** 2
out['em_20_5'] = em(0.05, 0.8, 0.2, 0.05)
out['em_10_rel10'] = em(0.05, 0.8, 0.10, 0.01)
# z-test and chi-square
zs, p = proportions_ztest([250, 200], [1000, 1000])
out['z_200_250'] = [zs, p]
chi, pchi, _ = proportions_chisquare([250, 200], [1000, 1000])[:3]
out['chi_200_250'] = [chi, pchi]
c2 = stats.chi2_contingency([[200, 800], [250, 750]], correction=True)
out['yates_200_250'] = [c2[0], c2[1]]
out['fisher_200_250'] = stats.fisher_exact([[200, 800], [250, 750]])[1]
zs, p = proportions_ztest([520, 480], [10000, 10000], alternative='larger')
out['z_480_520_greater'] = [zs, p]
out['srm_5000_5300'] = stats.chisquare([5000, 5300]).pvalue
# Fisher 2x2
out['tea_greater'] = stats.fisher_exact([[3, 1], [1, 3]], alternative='greater')[1]
out['tea_two'] = stats.fisher_exact([[3, 1], [1, 3]])[1]
out['conv_less'] = stats.fisher_exact([[2, 15], [10, 3]], alternative='less')[1]
out['f_8_2_1_5'] = stats.fisher_exact([[8, 2], [1, 5]])[1]
# Chi-square r x c
c = stats.chi2_contingency([[1, 3, 10, 6], [2, 3, 10, 7], [1, 6, 14, 12], [0, 1, 9, 11]], correction=False)
out['job_chi'] = [c[0], c[1], c[2]]
# Brute-force Fisher-Freeman-Halton for small tables
def ffh(t):
    t = np.array(t); R = t.sum(1); C = t.sum(0); N = t.sum()
    lf = [math.lgamma(i + 1) for i in range(N + 1)]
    K = sum(lf[r] for r in R) + sum(lf[c] for c in C) - lf[N]
    lp = lambda m: K - sum(lf[v] for v in m.flatten())
    obs = lp(t); tot = 0.0
    r, cc = t.shape
    def cols(j, Rrem, acc):
        nonlocal tot
        if j == cc - 1:
            m = np.column_stack(acc + [Rrem]); v = lp(m)
            if v <= obs + 1e-7: tot += math.exp(v)
            return
        for x in itertools.product(*[range(min(Rrem[i], C[j]) + 1) for i in range(r)]):
            if sum(x) == C[j]: cols(j + 1, Rrem - np.array(x), acc + [np.array(x)])
    cols(0, R.copy(), [])
    return tot
out['ffh_3x3'] = ffh([[3, 1, 0], [1, 4, 2], [0, 2, 5]])
out['ffh_2x4'] = ffh([[2, 7, 1, 4], [6, 2, 5, 1]])
out['ffh_3x4'] = ffh([[0, 3, 2, 1], [2, 1, 0, 3], [4, 0, 1, 1]])
# Peeking: false positive rate with K equally spaced looks at |Z| >= 1.96, fine-grid recursion (h = 0.01)
def cross(bounds, h=0.01):
    phi = lambda x: np.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)
    xs = None
    for k, b in enumerate(bounds, 1):
        B = b * math.sqrt(k); n = int(math.ceil(B / h)); n += n % 2; g = np.linspace(-B, B, 2 * n + 1)
        w = np.ones_like(g); w[1:-1:2] = 4; w[2:-1:2] = 2; w *= (g[1] - g[0]) / 3
        f = phi(g) if xs is None else (fw[None, :] * phi(g[:, None] - xs[None, :])).sum(1)
        xs, fw = g, f * w
    return 1 - fw.sum()
for K in (2, 3, 5, 10):
    out[f'peek_{K}'] = cross([z(0.975)] * K)
# Cross-check K = 2 and 3 with scipy's multivariate normal CDF (Genz)
def mvn_cross(K, c):
    cov = np.array([[math.sqrt(min(i, j) / max(i, j)) for j in range(1, K + 1)] for i in range(1, K + 1)])
    lo, hi = np.full(K, -c), np.full(K, c)
    return 1 - stats.multivariate_normal(mean=np.zeros(K), cov=cov).cdf(hi, lower_limit=lo)
out['peek_2_mvn'] = mvn_cross(2, z(0.975)); out['peek_3_mvn'] = mvn_cross(3, z(0.975))
def solve(K, shape, alpha=0.05):
    lo, hi = 1.9, 5.0
    for _ in range(40):
        mid = (lo + hi) / 2
        b = [mid] * K if shape == 'pocock' else [mid * math.sqrt(K / k) for k in range(1, K + 1)]
        if cross(b, 0.02) > alpha: lo = mid
        else: hi = mid
    return (lo + hi) / 2
out['pocock_5'] = solve(5, 'pocock'); out['obf_5'] = solve(5, 'obf')
out['pocock_2'] = solve(2, 'pocock'); out['obf_2'] = solve(2, 'obf')
print(json.dumps(out, indent=1, default=float))
