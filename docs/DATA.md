# Result data contract

Bond data additionally contains a supplementary `rates` array. See the
[rate contract and source timing](BOND-RATES.md#payload); return-index fields and
their meaning are unchanged.

The frontend reads `data/results.json` (Korea), `data/results-us.json` (US),
`data/results-japan.json` (Japan), and `data/results-hk.json` (Hong Kong).
All amounts and ratios are JSON numbers, not formatted strings. Payload cutoffs may differ: US updates at 07:00 and Asian screens at 21:00 KST.
Trading anchors remain independent. See [timing](TIMING.md).

## Common payload

| Field | Meaning |
| --- | --- |
| `generatedAt` | Fetch/write timestamp, ISO 8601 with Korea-time offset in current outputs |
| `snapshotAt` | Eligible 07:00 or 21:00 KST cutoff, ISO 8601 |
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
| `marketCap` | Full local-currency amount; non-Korean markets may use null |
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
- Footers distinguish close/cap dates from the per-market cutoff without duplicating
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
with an empty sample. `schemaVersion` is 1. `snapshotAt` is the latest tracking update cutoff,
`generatedAt` is the write time, and `startedAt` is the feature's initialization
time. `markets.<market>.asOf` records each independent session date; optional
`markets.<market>.snapshotAt` records its source result cutoff. A repeated session
at another cutoff does not count twice or hide a final-day episode.

Each entry in `episodes` contains:

| Field | Meaning |
| --- | --- |
| `id` | Market, ticker, and discovery date joined with colons |
| `market`, `ticker`, `name` | Security identity; market is `kospi`, `us`, `japan` or `hk` |
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

Optional `morningQuote` is a separate timestamped 07:00 USD/KRW reference. Its
schema, stale handling and Home display are defined in [Timing](TIMING.md).
Top-level snapshotAt/generatedAt and pairs still describe evening daily history.

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

The daily-history fetcher uses the evening 21:00 KST cutoff and excludes the entire
cutoff-date FX bar. Dates are Yahoo daily observation labels, not intraday
prices or guaranteed Korean closing times. Weekends/missing observations are
not filled. Provider revisions may change historical values. A valid batch
requires all eight pairs, at least 1,200 observations per pair and shared dates,
history from December 1, 2003 (up to seven days of start-date tolerance), and last observations within seven calendar days of the
eligible end date. No partial FX batch is published.

The default chart range is 1M. Each chart has independent controls. Presets extend to 20Y and MAX; custom ranges accept a
calendar-day lookback or inclusive exact dates within available history. 1D
uses the latest two observations. The fetcher retains history from December 2003. All overlays start off;
valid settings apply immediately. A partial warm-up at the very beginning
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
and publishes all eleven JSON outputs through the evening cycle of the same task.

## Crypto and bond histories (`data/crypto.json`, `data/bonds.json`)

Both use `schemaVersion: 1`, `source`, `snapshotAt`, `generatedAt` and `asOf`.
Crypto uses `assetClass: "crypto"`, `priceBasis: "unadjusted-close"`, and `assets`.
Bonds uses `assetClass: "government-bond-indices"`,
`priceBasis: "total-return-index"`, and `bonds`.
Each instrument includes `code`, `name`, `ticker`, `unit`, `pricePrefix`,
`decimals`, `historyStart`, `asOf`, and ordered `{date, close}` history.
Bond entries also include `source`, `country`, `currency` and `maturity`.
Bond `close` means total-return index points, not a traded product price.

Every configured instrument, metadata field, and coverage boundary is validated.
Crypto requires all UTC calendar dates and excludes the cutoff day's unfinished
bar. Korean indices allow the cutoff date; US indices exclude it. Actual provider
dates remain visible; up to seven days of end-date lag is allowed. Bond interior
gaps over 21 calendar days fail validation. Top-level `asOf` is the minimum of
instrument latest dates. See [sources and coverage](CRYPTO-BONDS.md).

## Japan and Hong Kong

These use the common equity contract with `market`, `currency` (JPY/HKD),
`source`, and `universe` metadata. Official Nikkei 225 / Hang Seng constituents
are reconciled to the cutoff with effective-dated change logs when needed.
Yahoo symbols use `.T` and `.HK`. Missing constituent history fails the batch.
Caps follow the US reported/estimated/unavailable convention. Tracking records
use market keys `japan` and `hk`; existing Korean/US episodes are preserved.

## Equity-index history (`data/indices.json`)

Nine daily price indices across the four equity markets use `priceBasis: "price-index"`
and `assetClass: "equity-indices"`. See [the complete contract and symbols](INDICES.md).
The morning cycle refreshes US indices while preserving Asian histories; the
evening cycle refreshes all nine. All source observation dates remain visible.

## Market metrics (`data/metrics.json`)

See [Metrics contract and timing](METRICS.md). Five ordered source records use
current/stale/unavailable states. OAS is stored in percent, displayed as basis
points. The shared history field `close` contains a metric observation, not a
tradable price. The evening cycle refreshes all five metrics; morning refreshes only VIX.
Other records retain their values and original fetchedAt. See [timing](TIMING.md).

## Home summaries

Home reads the same independently loaded payloads, with no extra provider requests
or stored summary file. Values use the final observation and its date; changes
compare the final two observations, regardless of chart range/indicator settings.
JPY applies displayUnits=100; OAS converts source percent to bps. Nonpositive
price observations have no percentage change. Metrics use absolute changes.
Match counts come from stocks.length. Tracking counts use active episodes and
the same visible final-day episode predicate as the tracking tab, excluding archived
completed episodes. Missing/failed data is unavailable, never a synthetic zero.

When morningQuote is present, the USD/KRW Home row uses its value and actual
observation timestamp, without comparing it to a daily close. Other FX rows and
all daily chart/indicator histories are unchanged.
