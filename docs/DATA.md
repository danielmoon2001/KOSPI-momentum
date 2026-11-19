# Result data contract

The frontend reads `data/results.json` (Korea) and `data/results-us.json` (US).
All amounts and ratios are JSON numbers, not formatted strings. Both payloads
describe the same daily cutoff, with potentially different trading anchors.

## Common payload

| Field | Meaning |
| --- | --- |
| `generatedAt` | Fetch/write timestamp, ISO 8601 with Korea-time offset in current outputs |
| `snapshotAt` | Most recent eligible 21:00 KST cutoff, ISO 8601 |
| `asOf` | Final evaluation trading date, `YYYY-MM-DD` |
| `volumeMultiplier` | Strict volume-ratio threshold; default 1.5 |
| `priceMultiplier` | Strict price-ratio threshold; default 1.1 |
| `windowDays` | Compatibility field: 5; now the base's calendar length |
| `baseCalendarDays` | 5 calendar days immediately before the first evaluation date |
| `evalTradingDays` | Latest 3 trading dates, including `asOf` |
| `dates` | Ascending trading dates in the base and evaluation windows |
| `stocks` | Matches ordered by descending rounded price ratio; may be empty |
| `universe` | Market-specific membership metadata |

`asOf` equals the last entry of `dates`. Each stock's `closes` array aligns
one-to-one with `dates`. Calendar gaps are expected. Current outputs reject
non-finite JSON values; missing history entries are null.

Runs from November 17, 2026 use a three-session evaluation window. Its first
date is the third-last entry in `dates`; the base is the five calendar dates
immediately before that date, retaining only actual available trading sessions.
Earlier payloads lack `baseCalendarDays`/`evalTradingDays` and used two adjacent
five-calendar-day windows. Displayed ratios still use the same averaging and
threshold rules. The update does not rewrite previously completed snapshots.

## Stock entries

| Field | Meaning |
| --- | --- |
| `ticker`, `name` | Symbol and display name; Korean symbols remain strings with leading zeros |
| `marketCap` | Full KRW or USD amount; US may use null |
| `volumeRatio`, `priceRatio` | Ratios rounded to two decimals after filtering |
| `closes` | Aligned daily closing prices, or null for unavailable observations |

The filters use unrounded ratios. A displayed ratio can equal a threshold after
rounding even though its unrounded value exceeded it.

Korea additionally supplies `universe.name = "KOSPI 200"`, `indexCode = "1028"`,
the anchor-date `asOf`, and API constituent `count`. KRX caps are required for
matches and use the anchor date. Currency is implied by the Korean route.

US additionally supplies top-level `market`, `currency`, and `source`.
`universe` includes name, count, historical Wikipedia revision URLs under
`sources`, and `retrievedAt`. `screenedCount` counts tradable candidates;
`excludedSecurities` records confirmed trading cessations with ticker,
`firstNonTradingDate`, reason, and authoritative source URL. A security may stop
trading before its index removal; earlier anchors remain eligible. Unexplained
missing data still fails the run. Stocks carry `indices`, `marketCapAsOf`, and
`marketCapMethod` (`reported`, `estimated`, or `unavailable`). Estimates also
record `sharesAsOf`. Quote dates or historical share observations constrain caps;
they do not make vendor data an immutable historical archive.

## Rendering and compatibility

- Caps abbreviate to 억/조 or bn/tn, with up to one decimal and currency symbols.
- `≈` identifies an estimated cap; `—` indicates missing data.
- Raw price cells have no currency symbol; the section subtitle specifies units.
  US prices keep cents and Korean prices use whole won.
- The frontend normalizes each stock to its first available close = 100.
- The top-right update date comes from `generatedAt`, converted to Korea time.
- Footers distinguish close/cap dates from the 21:00 cutoff without duplicating
  the cap date. Estimate/unavailable notes appear only when relevant.
- The frontend tolerates older files without `snapshotAt`, and older Korean
  `generatedAt` values without an offset (interpreted as Korea time).
- Evaluation metrics use `evalTradingDays` when present; otherwise they use
  the legacy `windowDays` calendar length and identify the earlier snapshot.
  Base metrics prefer `baseCalendarDays`, falling back to `windowDays`.

The files are outputs, not configuration. Do not hand-edit prices or inferred
membership. An empty valid `stocks` array means no matches; a fetch or validation
failure is a separate UI state.

## Tracking state (`data/tracking.json`)

This file is both a public dashboard payload and the next run's persistent
state. Preserve it when deploying or restoring the project; never replace it
with an empty sample. `schemaVersion` is 1. `snapshotAt` is the shared cutoff,
`generatedAt` is the write time, and `startedAt` is the feature's initialization
time. `markets.kospi.asOf` and `markets.us.asOf` record independent session dates.

Each entry in `episodes` contains:

| Field | Meaning |
| --- | --- |
| `id` | Market, ticker, and discovery date joined with colons |
| `market`, `ticker`, `name` | Security identity; market is `kospi` or `us` |
| `foundDate` | Trading date of the match that started this episode |
| `status` | `active` or `ended` |
| `survivedSessions` | Non-declining sessions after discovery, excluding the ending session |
| `history` | Ordered `{date, close}` entries from discovery through the first decline |
| `endedDate` | First session with a close below the preceding recorded close |
| `completedAsOf` | Market anchor at which that ending was first processed |

The frontend shows active episodes and ended episodes whose `completedAsOf`
equals their market's current `asOf`. Weekends do not remove a record. If the
laptop misses sessions, the updater checks all intervening closes and stops at
the first decline; the completed record is displayed at least on that catch-up
snapshot, then hidden on the next market session. Hidden episodes remain in the
file as an archive. A later match can create a new episode for the same ticker.

Tracking uses the same price providers as screening, with four-decimal storage
precision to avoid false declines from binary floating-point noise. Missing or
invalid prices fail publication rather than ending an episode. The daily match
payloads remain independent and are not altered to hide tracked stocks.

## FX history (`data/fx.json`)

The `#fx` section loads this independently of equity results and tracking.
Top-level fields are `schemaVersion: 1`, `quoteCurrency: "KRW"`, `source`,
`snapshotAt`, `generatedAt`, `asOf`, and `pairs`. `asOf` is the earliest of the
eight pairs' latest dates, indicating coverage through that date. Pair cards
display their own final observation within the selected range, including historical ends.

Each pair has `code`, `name`, provider `ticker`, `sourceSymbols`, `method`,
`displayUnits`, `asOf`, and ascending `history` entries `{date, close}`. Codes
are USD, EUR, JPY, GBP, CNY, CHF, AUD, CAD in that order. Rates are positive finite
KRW per **one** foreign unit. `displayUnits` is 100 for JPY and 1 otherwise.

`method` is `direct` except for CNY (`usd-cross`): KRW per USD divided by CNY per
USD, matched by date. Source symbols are `KRW=X` and `CNY=X` for that cross.
Cross-rate daily observations need not be synchronized executable quotes.
Yahoo's direct CNY/KRW history was unavailable when this feature was initialized.

The local fetcher uses the shared 21:00 KST cutoff and excludes the entire
cutoff-date FX bar. Dates are Yahoo daily observation labels, not intraday
prices or guaranteed Korean closing times. Weekends/missing observations are
not filled. Provider revisions may change historical values. A valid batch
requires all eight pairs, at least 1,200 observations per pair and shared dates,
2,225 calendar days of history (up to seven days of start-date tolerance), and last observations within seven calendar days of the
eligible end date. No partial FX batch is published.

The default chart range is 3M. Presets extend to 5Y; custom ranges accept a
calendar-day lookback or inclusive exact dates within available history. 1D
uses the latest two observations. The fetcher retains five years plus 400
calendar days for indicator warm-up. A partial warm-up at the very beginning
is displayed as unavailable, not zero. Indicators use the full stored history
before chart cropping; a historical view ends with its historical price and
state. No frontend provider requests are made. See [FX-RULES.md](FX-RULES.md)
for averages, prior-close channels and percentage filter state transitions.

Daily reference rates exclude customer conversion spreads and fees. The public
dashboard contains no FX credentials and makes no live provider calls.

## Commodity futures (`data/commodities.json`)

Top-level fields: `schemaVersion: 1`, `assetClass: "commodity-futures"`,
`quoteCurrency: "USD"`, `source`, `snapshotAt`, `generatedAt`, `asOf`, `commodities`.
`asOf` is the earliest latest observation date across the nine series.
`quoteCurrency` identifies the denomination; **per-series units can be US cents**.

Each entry contains `code`, `name`, `ticker`, `category`, `unit`, `pricePrefix`,
`decimals`, `asOf`, and ascending `history` entries `{date, close}`. Codes are
`gold`, `silver`, `copper`, `wti`, `brent`, `gas`, `wheat`, `corn`, `soybeans`, in
that order. Prices stay in provider quote units. Zero/negative futures prices
are retained; non-finite values are rejected. No contract-month or roll-adjustment
metadata is inferred from the generic Yahoo symbol.

See [COMMODITIES.md](COMMODITIES.md) for exact ticker/unit mappings, validation,
cutoff, display precision and nonpositive-price handling. The browser loads this
file independently of FX, equity matches and tracking. The daily runner stages
and publishes all five JSON outputs through the existing single-task cycle.
