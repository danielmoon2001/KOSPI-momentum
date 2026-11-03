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
| `windowDays` | Calendar days in each window; currently 5 |
| `dates` | Ascending trading dates in the base and evaluation windows |
| `stocks` | Matches ordered by descending rounded price ratio; may be empty |
| `universe` | Market-specific membership metadata |

`asOf` equals the last entry of `dates`. Each stock's `closes` array aligns
one-to-one with `dates`. Calendar gaps are expected. Current outputs reject
non-finite JSON values; missing history entries are null.

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

- Caps abbreviate to 억/조 or bn/tn, with up to two decimals and currency symbols.
- `≈` identifies an estimated cap; `—` indicates missing data.
- Raw price cells have no currency symbol; the section subtitle specifies units.
  US prices keep cents and Korean prices use whole won.
- The frontend normalizes each stock to its first available close = 100.
- The top-right update date comes from `generatedAt`, converted to Korea time.
- Footers distinguish close/cap dates from the 21:00 cutoff without duplicating
  the cap date. Estimate/unavailable notes appear only when relevant.
- The frontend tolerates older files without `snapshotAt`, and older Korean
  `generatedAt` values without an offset (interpreted as Korea time).

The files are outputs, not configuration. Do not hand-edit prices or inferred
membership. An empty valid `stocks` array means no matches; a fetch or validation
failure is a separate UI state.
