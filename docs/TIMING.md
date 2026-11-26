# Morning US and evening dashboard updates

| Korea time | Updates |
| --- | --- |
| 07:00 | US equity matches and tracking, four US price indices, VIX, morning USD/KRW reference |
| 21:00 | Existing full dashboard, preserving a successful same-day morning US screen |

The laptop must retain a signed-in session and have network access when updating.
The task pre-wakes at 06:55/20:55 KST and holds the laptop awake through preparation
and the entire update. Fetching begins no earlier than the 07:00/21:00 cutoff;
on-the-hour triggers remain as fallbacks. Windows can return an unattended wake to
sleep after the update releases its temporary power request. There is no fixed
20/30-minute sleep deadline that could interrupt an active update.
Normal user-idle sleep settings are unchanged. Actual wake/network behavior depends
on the laptop and power configuration; shutdown and sign-out still prevent runs.
Sign-in/resume catches up to the latest due cutoffs. Separate completion
records prevent duplicate cycles; one shared lock prevents overlapping publication.
Missed cycles use currently available provider history, not immutable data vintages.

## US regular sessions and tracking

07:00 KST follows the normal 16:00 Eastern close by one hour in US standard time,
two in daylight saving time. The expected session comes from the XNYS exchange
calendar, including holidays and early closes. US prices/volumes are daily
regular-session observations; pre/post-market prices remain excluded.

US screening, tracking and the four US price indices publish together. If required
data has not reached the expected session, the prior valid group stays visible.
Morning preserves Asian index histories, stock results and tracking episodes.
Evening does not rescreen a successful morning US session.

Tracking counts market sessions, not update runs. Morning discovery begins at zero;
an evening update cannot add a survived day or hide that session's first-down-day
record. Holidays/weekends with no new session do not advance tracking. The first
down day remains visible until the next processed session for that market.

## VIX

VIX comes from Cboe's daily historical CSV. Morning checks for the expected US
session. Delayed/missing data is labeled and does not withhold complete US results.
Other metrics retain their original values and fetch times until evening. The task
can retry delayed morning references three times, five minutes apart, without
repeating primary US screening or tracking transitions. Later sign-in/resume can
retry; a successful later evening supersedes the older morning cycle.

## Morning USD/KRW reference

`fx.json` retains its evening daily histories and adds optional `morningQuote`:

- `ticker: "KRW=X"`, `baseCurrency: "USD"`, `quoteCurrency: "KRW"`.
- `interval: "5m"`, `source: "Yahoo Finance"`, `snapshotAt`: the 07:00 KST cutoff.
- `value`: KRW per USD; `observedAt`: end of the selected five-minute bar.
- `fetchedAt`: actual retrieval time; `status`: current, stale, or unavailable.

Only a completed five-minute bar ending at/before 07:00 is eligible. A laptop
started at noon still uses the morning cutoff, never the noon price. A reference
older than one hour is delayed. Weekend observations retain their actual timestamps;
Sunday/Monday FX-only delays do not request futile retries. On fetch failure, a
previous reference keeps its observation/fetch time and becomes stale. Without a
prior value the reference is unavailable, not zero.

Home uses this reference when present, without a daily percentage comparison. The
FX page shows it separately above the unchanged daily USD/KRW chart. It never enters
daily history, chart indicators or cross-rate calculations. It is a provider
reference, not an executable bank quote or an official daily close.

## Reading dates

`snapshotAt` is the processing cutoff; `asOf` is the market date; `generatedAt` is
file generation time. Mixed cutoffs are expected. Indices/metrics have independently
dated instruments; FX history and morningQuote have separate timestamps. A newer
homepage update date does not mean every series has new data. Provider revisions
and publication outages remain possible.
