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

<!-- data-servers:start -->
## More data servers from the same author

Each one is free, needs no API key and has a hosted URL you can paste into Claude or ChatGPT.

| server | tools | hosted URL |
|---|---|---|
| [cups-to-grams-mcp](https://github.com/theluckystrike/cups-to-grams-mcp) | convert_ingredient, search_ingredients, scale_recipe, convert_oven_temperature | `https://cups-to-grams-mcp.lipmichal.workers.dev/mcp` |
| [dscr-loan-calculator-mcp](https://github.com/theluckystrike/dscr-loan-calculator-mcp) | calculate_dscr, max_loan_for_target_dscr, rent_needed_for_target_dscr, compare_scenarios, amortization_summary | `https://dscr-loan-calculator-mcp.lipmichal.workers.dev/mcp` |
| [gold-price-per-gram-mcp](https://github.com/theluckystrike/gold-price-per-gram-mcp) | get_gold_price_per_gram, get_metal_prices, calculate_jewelry_value, convert_gold_units | `https://gold-price-per-gram-mcp.lipmichal.workers.dev/mcp` |
| [lake-level-mcp](https://github.com/theluckystrike/lake-level-mcp) | search_lakes, get_lake_level, get_lake_history, compare_lakes | `https://lake-level-mcp.lipmichal.workers.dev/mcp` |
| [minimum-wage-mcp](https://github.com/theluckystrike/minimum-wage-mcp) | get_minimum_wage, list_upcoming_increases, compare_states, annual_income_at_minimum_wage | `https://minimum-wage-mcp.lipmichal.workers.dev/mcp` |
| [no-tax-on-overtime-mcp](https://github.com/theluckystrike/no-tax-on-overtime-mcp) | calculate_overtime_deduction, calculate_tips_deduction, calculate_senior_deduction, estimate_tax_savings, explain_eligibility | `https://no-tax-on-overtime-mcp.lipmichal.workers.dev/mcp` |
| [paycheck-calculator-mcp](https://github.com/theluckystrike/paycheck-calculator-mcp) | calculate_take_home_pay, compare_states_take_home, salary_to_hourly, hourly_to_salary, get_federal_tax_brackets | `https://paycheck-calculator-mcp.lipmichal.workers.dev/mcp` |
| [uk-income-tax-salary-mcp](https://github.com/theluckystrike/uk-income-tax-salary-mcp) | calculate_uk_take_home, get_uk_tax_bands, compare_salaries, marginal_rate_at_income | `https://uk-income-tax-salary-mcp.lipmichal.workers.dev/mcp` |
| [us-federal-holidays-business-days-mcp](https://github.com/theluckystrike/us-federal-holidays-business-days-mcp) | list_federal_holidays, is_business_day, add_business_days, count_business_days, invoice_due_date | `https://us-federal-holidays-business-days-mcp.lipmichal.workers.dev/mcp` |
| [aca-premium-tax-credit-calculator-mcp](https://github.com/theluckystrike/aca-premium-tax-credit-calculator-mcp) | get_federal_poverty_level, calculate_premium_tax_credit, check_subsidy_cliff, get_aptc_repayment_cap | `https://aca-premium-tax-credit-calculator-mcp.lipmichal.workers.dev/mcp` |
| [ap-score-distributions-mcp](https://github.com/theluckystrike/ap-score-distributions-mcp) | get_ap_score_distribution, estimate_ap_percentile, compare_ap_exams, list_ap_exams, estimate_ap_score_from_composite | `https://ap-score-distributions-mcp.lipmichal.workers.dev/mcp` |
| [car-loan-interest-deduction-calculator-mcp](https://github.com/theluckystrike/car-loan-interest-deduction-calculator-mcp) | calculate_car_loan_interest_deduction, calculate_salt_deduction, get_tax_brackets_and_standard_deduction, calculate_child_tax_credit | `https://car-loan-interest-deduction-calculator-mcp.lipmichal.workers.dev/mcp` |
| [recipe-nutrition-calculator-mcp](https://github.com/theluckystrike/recipe-nutrition-calculator-mcp) | lookup_ingredient_nutrition, calculate_recipe_nutrition, round_nutrition_label, scale_recipe_nutrition | `https://recipe-nutrition-calculator-mcp.lipmichal.workers.dev/mcp` |
| [retirement-contribution-limits-2027-mcp](https://github.com/theluckystrike/retirement-contribution-limits-2027-mcp) | get_contribution_limits, calculate_max_contribution, get_social_security_cola, compare_years | `https://retirement-contribution-limits-2027-mcp.lipmichal.workers.dev/mcp` |
| [section-179-deduction-calculator-mcp](https://github.com/theluckystrike/section-179-deduction-calculator-mcp) | calculate_section_179, calculate_bonus_depreciation, get_vehicle_depreciation_limits, calculate_asset_loan_payment | `https://section-179-deduction-calculator-mcp.lipmichal.workers.dev/mcp` |
| [student-loan-repayment-assistance-plan-calculator-mcp](https://github.com/theluckystrike/student-loan-repayment-assistance-plan-calculator-mcp) | calculate_rap_payment, compare_rap_vs_standard, get_federal_loan_limits, get_plan_transition_dates | `https://student-loan-repayment-assistance-plan-calculator-mcp.lipmichal.workers.dev/mcp` |
| [subdomain-finder-mcp](https://github.com/theluckystrike/subdomain-finder-mcp) | find_subdomains, resolve_subdomains, get_certificate_history, summarize_attack_surface | `https://subdomain-finder-mcp.lipmichal.workers.dev/mcp` |

The paid back-office collection (invoices, VAT, PDFs, spreadsheets) is at https://mcp.zovo.one
<!-- data-servers:end -->
