# KOSPI & US Momentum

Minimal static dashboard designed by Moon Quixote. Vanilla HTML/CSS/JavaScript;
no framework or build step.

## Pages and independent results

- `#overview`: two market buttons, match counts, and separate session dates.
- `#KOSPImatches`: KOSPI matches, KRW prices (₩), market caps, raw and normalized history.
- `#USmatches`: Nasdaq-100 or S&P 500 matches, USD prices ($), market caps, raw and normalized history.
- Legacy `#matches` links still open the KOSPI view.

KOSPI reads `data/results.json`; US reads `data/results-us.json`. Each file has
its own `asOf` session date and `generatedAt` timestamp. Switching markets also
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
lists by the US screener; it is not a broad Nasdaq-market screen.

## Updates

| Market | Korea-time run window | Local runner | Published file |
| --- | --- | --- | --- |
| KOSPI | 21:00-07:00 | `../KOSPI Momentum/auto_run.py` | `data/results.json` |
| US | 07:00-17:00 | `../US Momentum/auto_run.py` | `data/results-us.json` |

Both schedules try hourly during their windows and skip an already completed
cycle. They run while this Windows computer is available and the user logged in.
The shared `../automation_publish.py` serializes publication and commits only
the corresponding market's JSON. Frontend changes require a separate Git commit
and push; they are never swept into an automatic data commit.

## Local development

From this `website` directory:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. Do not open index.html through file://, which blocks
JSON fetching. Serve only this directory, not the parent containing credentials.

Regression tests for routing, independent load failures, empty results, and
currency formatting live at `../test_frontend.cjs`.
