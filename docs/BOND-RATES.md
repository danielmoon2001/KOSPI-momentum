# Policy rates and government yields

The Bonds page adds current reference rates above the existing total-return
charts. Rates are annual percentages; changes are basis points versus the previous
available observation (1 bp = 0.01 percentage point). A yield increase is not a
positive bond investment return. The charts below still show total-return indices.

## Sources and coverage

| Country | Series | Official series identifier |
| --- | --- | --- |
| Korea | BOK base rate | BOK ECOS 722Y001 / 0101000 |
| Korea | Treasury 2Y / 3Y / 5Y | ECOS 817Y002 / 010195000 / 010200000 / 010200001 |
| Korea | Treasury 10Y / 20Y / 30Y | ECOS 817Y002 / 010210000 / 010220000 / 010230000 |
| US | Fed target lower / upper | FRED DFEDTARL / DFEDTARU |
| US | Effective federal funds | FRED DFF |
| US | Treasury 3M / 1Y / 2Y / 5Y | FRED DGS3MO / DGS1 / DGS2 / DGS5 |
| US | Treasury 10Y / 20Y / 30Y | FRED DGS10 / DGS20 / DGS30 |

[BOK ECOS](https://ecos.bok.or.kr/) supplies Korean daily rates, including
market yields compiled from Korean bond-market statistics. US Treasury yields
are [constant-maturity market yields](https://fred.stlouisfed.org/series/DGS10),
not coupons or the return indices shown below. The
[Fed target range](https://fred.stlouisfed.org/series/DFEDTARU) is a policy setting;
the [effective rate](https://fred.stlouisfed.org/series/DFF) is a separate observed
overnight rate. Target bounds are displayed together only when their dates match.

## Snapshot and availability

Rates retain the latest 21:00 KST evening snapshot. The morning US cycle does not refresh bond rates.
The BOK base series permits the cutoff date. Korean Treasury yields conservatively
use dates before the cutoff, allowing for ECOS publication; US target/ Treasury
series also use dates before the cutoff. Effective fed funds uses two calendar
days before the cutoff to allow its next-US-morning publication. These eligibility
limits are not promises of source availability: every displayed rate shows its
actual observation date, including weekends and holidays.

ECOS requests the latest ten calendar days using its public ten-row endpoint;
no API key is required. FRED requests each series separately for a recent month.
The latest 40 observations are retained per rate; they support change calculations,
not a new long-history chart. Recent provider revisions replace prior observations.
Current provider data are not an immutable historical publication-time archive.

A failed source retains its previously validated observations with **Delayed**
and the original fetch time. Without prior observations it shows **Unavailable**,
never zero. An observation over seven calendar days old is also labeled delayed.
Valid zero/negative rates remain valid values. These supplementary source outages
do not block the required bond indices or other daily datasets; invalid schemas
still fail validation. Provider availability is not guaranteed by the regression tests.

Home shows BOK, Korea 3Y/10Y, the Fed target range and US 2Y/10Y alongside selected
bond return indices. Full rates remain in Bonds. Rate changes use bp, while Home's
return-index changes remain percentages.

## Payload

`data/bonds.json` keeps its existing schema and nine index histories. Its additive
`rates` array contains 17 ordered series, with `code`, `name`, `country`, `series`,
`table` (ECOS only; null for FRED), `source`, `sourceUrl`, `unit: "Percent"`,
`lagDays`, `history: [{date, close}]`, `asOf`, `fetchedAt` and
`status: current | stale | unavailable`. `close` here means the daily rate in
percentage points, not a traded security price. Unavailable entries have empty
history and null dates. The bond payload's top-level `asOf` continues to describe
the return indices; it is not the rate date. Older snapshots without `rates`
remain readable and show unavailable rate rows.
