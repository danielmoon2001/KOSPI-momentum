# Equity index history

`#indices` is a history dashboard, independent of the equity screener and tracker.
All nine indices stay visible regardless of their movements or technical signals.

| Market | Index | Yahoo symbol | History starts |
| --- | --- | --- | --- |
| Korea | KOSPI | `^KS11` | January 2000 |
| Korea | KOSDAQ | `^KQ11` | October 2000 |
| US | S&P 500 | `^GSPC` | January 2000 |
| US | Nasdaq-100 | `^NDX` | January 2000 |
| US | Nasdaq Composite | `^IXIC` | January 2000 |
| US | Dow Jones Industrial Average | `^DJI` | January 2000 |
| Japan | Nikkei 225 | `^N225` | January 2000 |
| Hong Kong | Hang Seng | `^HSI` | January 2000 |
| Hong Kong | Hang Seng China Enterprises | `^HSCE` | January 2000 |

These are daily **price-index levels**, expressed in index points. They exclude
reinvested dividends and are not individual stocks or ETF share prices. The
chart universe is broader than the stock-screening universes: KOSDAQ, for example,
appears here without changing the Korean screener's KOSPI 200 restriction.
TOPIX is not supplied by the selected Yahoo feed and is not replaced with an ETF.

All histories use the same latest 21:00 KST snapshot. Korean, Japanese and Hong
Kong observations on that calendar date are eligible. US observations must be
earlier. Cards display actual provider dates; weekends and holidays are not filled.
Daily data is retained from the dates above, with no synthetic long-term points.
Provider revisions can change earlier observations.

Missing Yahoo observations for KOSPI/KOSDAQ can be filled from official KRX
index 1001/2001 closes; Nikkei 225, Hang Seng and Hang Seng China Enterprises
can use their publishers' daily histories. Only
exact-date official observations are accepted, and valid Yahoo values are kept.
There is no forward-fill or inferred close. Unresolved invalid values still
reject publication. Repaired entries carry optional `officialRepairs` metadata
(`source` and `dates`), and the payload source identifies mixed-source histories.

Each chart starts at **1M** (30 calendar days), with independent presets through
20Y/MAX, custom day counts and exact dates. Indicators start off and valid
settings apply immediately. Enabled indicators calculate on full history before
cropping. See [technical rules](FX-RULES.md). Reload restores defaults.

## Data contract

`data/indices.json` contains `schemaVersion: 1`, `assetClass: "equity-indices"`,
`priceBasis: "price-index"`, `source`, `snapshotAt`, `generatedAt`, `asOf`, and
`indices`. Instrument entries include `code`, `name`, `ticker`, `country`,
`historyStart`, `unit: "Index points"`, `pricePrefix: ""`, `decimals: 2`, `asOf`,
and ordered `{date, close}` history. Top-level `asOf` is the earliest of the nine
latest dates. Every configured series is required. Invalid metadata, nonpositive
levels, duplicate dates, truncated coverage, interior gaps over 21 calendar days,
or end-date lag over seven days reject the batch.

Source: [Yahoo Finance world indices](https://finance.yahoo.com/markets/world-indices/).
Official gap-repair sources: [KRX](https://data.krx.co.kr/),
[Nikkei 225 daily history](https://indexes.nikkei.co.jp/en/nkave/archives/data),
[Hang Seng](https://www.hsi.com.hk/eng/indexes/all-indexes/hsi) and
[Hang Seng China Enterprises](https://www.hsi.com.hk/eng/indexes/all-indexes/hscei).
