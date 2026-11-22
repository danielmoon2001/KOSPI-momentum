# Market metrics

The Metrics page (#metrics) shows daily reference observations, with 1M initially
selected and range controls beside every chart. These are context indicators,
not tradable instruments. Changes are absolute points/ratio units/basis points;
no percentage-return or long/short strategy is implied.

| Metric | Source | Units and coverage |
| --- | --- | --- |
| VIX | [Cboe daily history](https://www.cboe.com/tradable_products/vix/vix_historical_data/) | Index points; available from January 1990 |
| MOVE | [Yahoo Finance / ICE](https://finance.yahoo.com/quote/%5EMOVE/) | Index points; available from November 2002 |
| Cboe put/call | [Cboe daily statistics](https://www.cboe.com/markets/us/options/market-statistics/daily) | Total daily put volume / call volume, not equity-only or open interest; seeded with 90 calendar days and accumulated thereafter |
| ICE BofA US High Yield OAS | [FRED BAMLH0A0HYM2](https://fred.stlouisfed.org/series/BAMLH0A0HYM2) | Source percentages, displayed in basis points: 3.52% = 352 bps. FRED currently provides a rolling three years |
| CNN Fear & Greed | [CNN](https://www.cnn.com/markets/fear-and-greed) | Score 0–100; source history begins February 2021 |

## Snapshot and publication

The existing most-recent-21:00-KST cycle fetches metrics daily. VIX, MOVE, put/call
and CNN exclude the cutoff calendar date, avoiding the ongoing US session. CNN
also excludes timestamps after the cutoff and resolves duplicate daily updates.
OAS uses a conservative two-calendar-day lag because FRED's next-day morning US
publication occurs after 21:00 KST. Weekends and holidays can make actual dates older.
Every card shows its own observation date; the header's update date is the fetch
attempt, not a claim that all series have today's data.

These are latest-provider histories clipped to a cutoff, not an immutable archive
of exactly what had been published at every past instant. Revisions and publication
delays remain possible. No missing dates are filled or synthetic history created.
Cboe's older archive ends in 2019; it is not joined across a hidden multi-year gap.
OAS retains the currently available FRED window rather than rebuilding restricted
older coverage from other sources.

## Availability

Each source is independent. A failed refresh retains eligible previous observations
and their original fetchedAt, visibly labeled **Retained / delayed data**. With no
usable previous series, the card says **Source unavailable** and shows no invented
value. Observations over seven calendar days old are also labeled delayed. A successful
fetch can still lag a trading day; current means refreshed/recent, not real-time.

A metric outage does not block equity/history publication. It is attempted again
on the next normal snapshot cycle; there is no extra task or intraday refresh loop.
Existing required datasets keep their original failure behavior. Technical trading
controls are omitted on Metrics; the existing asset pages retain theirs.

## JSON contract

data/metrics.json: schemaVersion 1, assetClass "metrics", snapshotAt, generatedAt,
source, asOf (earliest available observation, or null), and ordered metrics:
vix, move, putcall, hy_oas, feargreed.

Each item has code, name, source, sourceUrl, unit, lagDays, status (current/stale/
unavailable), fetchedAt, asOf and history [{date, close}]. The shared chart engine
uses the field name close for an observation level. OAS close remains percent in
JSON. Unavailable items have empty history and null asOf/fetchedAt. Valid CNN scores
may equal zero; zero volatility levels and nonfinite/negative values are rejected.
Histories must be unique, ascending and within the source's cutoff policy.

Data belongs to the respective providers; links identify the series and methodology.
