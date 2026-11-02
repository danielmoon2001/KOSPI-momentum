# KOSPI & US Momentum

Minimal static dashboard designed by Moon Quixote. Vanilla HTML/CSS/JavaScript;
no framework or build step.

## Pages and independent results

- `#overview`: two market buttons, match counts, and separate session dates.
- `#KOSPImatches`: KOSPI matches, KRW prices (₩), market caps, raw and normalized history.
- `#USmatches`: Nasdaq-100 or S&P 500 matches, USD prices ($), market caps, raw and normalized history.
- Legacy `#matches` links still open the KOSPI view.

KOSPI reads `data/results.json`; US reads `data/results-us.json`. Each file has
the same `snapshotAt` cutoff (most recent 21:00 KST), plus its own `asOf` session
date and `generatedAt` fetch timestamp. Switching markets also
switches every table, currency, source, and timestamp. A failed or empty US
response does not prevent KOSPI from displaying (and vice versa).

## Rules

Both screeners default to volume > 1.5× (+50%), price > 1.1× (+10%), two rolling
5-calendar-day windows, and three strictly rising closes. Volume averages are
per trading session, so windows with different session counts remain comparable.
The JSON thresholds and `windowDays` drive the displayed metrics.

Market caps appear in the summary and beneath stock headings in both history
tables. KOSPI caps are from KRX on the anchor date. US caps are Yahoo-reported
when the quote date matches the anchor; historical estimates are explicitly
marked `≈`, and unavailable values are `—`. Normalized prices remain unitless.
US constituent membership is refreshed from Wikipedia's Nasdaq-100 and S&P 500
lists using the latest revisions at or before the cutoff; it is not a broad
Nasdaq-market screen.

## Updates

One Windows task, `Momentum_Daily_Snapshot`, runs `../auto_run.py` at sign-in,
resume, and 21:00 while awake. There are no hourly triggers or allowed-hour rules.
It runs while this computer is available and the user is signed in. The task
does not wake the laptop; missed runs catch up when available.

Both markets use the most recent 21:00 KST cutoff. At noon this is yesterday
evening; at 02:00 it is five hours earlier. KOSPI may use the cutoff's calendar
date; US may use dates through the preceding calendar day. Actual price history
selects the latest available trading session, including weekends and holidays.
The website displays the shared snapshot and each market's closing-data date.

The root `last_snapshot.txt` skips a successfully published cycle. A process lock
prevents overlapping triggers. Both screeners must succeed before either output
is replaced. Both JSON files are committed together and completion is recorded
only after push succeeds. Failures remain eligible for retry; a failed push
reuses the completed outputs. Task Scheduler retries failures up to three times
at five-minute intervals. Frontend edits require a separate commit and are never
swept into automatic data commits. `../install_task.ps1` installs/updates this
task and removes the two former schedules.

## Local development

From this `website` directory:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. Do not open index.html through file://, which blocks
JSON fetching. Serve only this directory, not the parent containing credentials.

Regression tests for routing, independent load failures, empty results, and
currency formatting live at `../test_frontend.cjs`.
