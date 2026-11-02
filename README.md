# ab-test-sample-size-calculator-mcp

A/B test sample size calculator and significance tests for AI assistants, with exact answers instead of mental arithmetic.

This is a Model Context Protocol (MCP) server. It works out how many users an A/B test needs, how long it must run, whether a result is significant (z-test, chi-square, Fisher exact), the Fisher-Freeman-Halton exact test for larger tables, and how much peeking inflates false positives. It needs no API key and makes no network calls.

## Tools

| Tool | What it returns |
| --- | --- |
| `calculate_sample_size` | Users per variant for a conversion-rate test: baseline, relative or absolute MDE, alpha, power, one or two-sided, several variants with optional Bonferroni, unequal splits. Also the figure Evan Miller's calculator gives for the same inputs. |
| `estimate_test_duration` | Days and whole weeks to reach the sample size, from daily visitors, traffic share and number of variants. |
| `test_ab_significance` | Two-proportion z-test, p-value, confidence interval, relative lift, chi-square with and without Yates, Fisher exact p and a sample ratio mismatch check. |
| `fisher_exact_test` | Exact p-value for a 2x2 table (two-sided, greater, less) or any r x c table (Fisher-Freeman-Halton), next to Pearson chi-square and an expected-count check. |
| `check_peeking_risk` | The real false positive rate when a test is checked K times, and Pocock and O'Brien-Fleming boundaries for up to 10 looks. |

Every result has structured JSON, a one-paragraph summary, `as_of`, `source` (the method references) and `more` (the matching calculator on [abwex.com](https://abwex.com/?utm_source=mcp&utm_medium=ab-test-sample-size-calculator-mcp)).

## What it knows that your model does not

- Exact inverse normal quantiles and the full sample size formula. Models round z-values, drop the pooled variance term or confuse relative and absolute MDE, and the answer moves by thousands of users.
- Why calculators disagree. The result shows both the standard pooled formula (as R `power.prop.test`) and Evan Miller's published formula, so a 37,513 vs 36,314 gap has an explanation.
- Exact hypergeometric sums. A Fisher-Freeman-Halton p-value for a 4 x 4 table needs millions of tables summed; it cannot be estimated in your head.
- Sequential testing numbers: checking 5 times at p < 0.05 gives a 14.2% false positive rate, and the boundaries that fix it.

## Install

### Hosted (Claude.ai custom connector, ChatGPT developer mode)

Paste this URL. No token, no sign-up.

```
https://ab-test-sample-size-calculator-mcp.lipmichal.workers.dev/mcp
```

### Claude Code

```
claude mcp add --transport http ab-test-calculator https://ab-test-sample-size-calculator-mcp.lipmichal.workers.dev/mcp
```

Or run it locally over stdio:

```
claude mcp add ab-test-calculator -- npx -y github:theluckystrike/ab-test-sample-size-calculator-mcp
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ab-test-calculator": { "command": "npx", "args": ["-y", "github:theluckystrike/ab-test-sample-size-calculator-mcp"] }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ab-test-calculator": { "url": "https://ab-test-sample-size-calculator-mcp.lipmichal.workers.dev/mcp" }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "ab-test-calculator": { "type": "http", "url": "https://ab-test-sample-size-calculator-mcp.lipmichal.workers.dev/mcp" }
  }
}
```

Node 20 or newer is needed for the local stdio version.

## Example prompts

- "Our checkout converts at 4.2%. How many users per variant to detect a 10% relative lift with 80% power?"
- "We get 4,000 visitors a day and want to test 3 variants. How many weeks will it take?"
- "Control had 420 conversions from 10,000, the variant 495 from 10,050. Is that significant?"
- "Run a Fisher-Freeman-Halton test on [[12, 30, 8], [20, 25, 15]]."
- "If I check the dashboard every day for 10 days, what is my real false positive rate?"

## Data sources

No live data. Methods and the published values the tests check against are in [DATA_SOURCES.md](DATA_SOURCES.md): R `power.prop.test` and `fisher.test` documentation outputs, Evan Miller's calculator code, scipy and statsmodels reference values (`scripts/reference.py`), Armitage et al. (1969) and Jennison and Turnbull (2000).

## Limitations

- Sample size covers conversion rates (two proportions). Continuous metrics such as revenue per user need the standard deviation and are not covered.
- Sample size and duration assume a fixed-horizon test analysed once. For several looks, plan with `check_peeking_risk`.
- The Fisher-Freeman-Halton test enumerates tables exactly. Very large or sparse r x c tables can exceed the work limit (lower on the hosted server than locally). The tool then returns the chi-square result with a note instead of an exact p.
- Peeking boundaries assume equally spaced looks and two-sided tests; boundaries are given for up to 10 looks.
- The confidence interval for the difference is the Wald interval, which is poor for rates near 0 or 1 with small samples.

## More

Interactive versions of these calculators and guides are on [abwex.com](https://abwex.com/tools/sample-size-calculator.html?utm_source=mcp&utm_medium=ab-test-sample-size-calculator-mcp), including the [Fisher-Freeman-Halton calculator](https://abwex.com/tools/fisher-freeman-halton-calculator/?utm_source=mcp&utm_medium=ab-test-sample-size-calculator-mcp) and the [peeking inflation calculator](https://abwex.com/tools/peeking-inflation-calculator?utm_source=mcp&utm_medium=ab-test-sample-size-calculator-mcp).

Part of the Zovo MCP collection: https://mcp.zovo.one

## Development

```
npm install
npm test                      # builds, then runs the fixture tests
python3 scripts/reference.py  # recomputes the reference values with scipy and statsmodels
node scripts/smoke-stdio.mjs  # stdio check, one call per tool
npx wrangler deploy           # Cloudflare Worker, Streamable HTTP at /mcp
```

## License

MIT
