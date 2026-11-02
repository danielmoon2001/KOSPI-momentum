# Korea & US Equity Momentum

A static dashboard designed by Moon Quixote.
[Open the live site](https://danielmoon2001.github.io/KOSPI-momentum/).

Vanilla HTML, CSS, and JavaScript; no frontend framework, build step, or browser
API credentials. This repository contains the **public website and generated
results**. The private local screeners and Windows task installation live outside
this Git repository and are not included in a clone.

## Repository layout

```text
index.html                  Overview and shared market-page markup
style.css                   Layout, typography, tables, responsive criteria
script.js                   Routing, result loading, formatting, rendering
hero_image.png              Hero illustration
data/results.json           Generated Korean results
data/results-us.json        Generated US results
docs/DATA.md                JSON contract and data semantics
docs/DESIGN.md              Current design conventions
docs/archive/               Historical design reference; not an active specification
```

## Views

| Route | Content |
| --- | --- |
| `#overview` | Introduction, market links, counts, and compact snapshot notes |
| `#KOSPImatches` | KOSPI 200 matches, raw prices, and normalized history |
| `#USmatches` | Nasdaq-100 / S&P 500 matches, raw prices, and normalized history |
| `#matches` | Compatibility alias for the Korean view |

The top-right date is the result fetch date in Korea time. Footer notes show the
snapshot cutoff and actual closing-data dates, which can differ between markets.
Each market loads independently: a failed or empty response does not prevent
the other market from displaying.

## Screening contract

- Two consecutive **5-calendar-day** windows, ending on the latest eligible session.
- Evaluation average daily volume / base average daily volume **> 1.5**.
- Final evaluation close / base average close **> 1.1**.
- Last three trading-session closes strictly increase.
- Korea: **KOSPI 200**, pykrx index `1028`, with membership on the anchor date.
- US: **Nasdaq-100 ∪ S&P 500**, using index-list revisions at or before the cutoff.

The local screeners apply these rules; the website only renders generated data.
Daily volume averages use actual trading sessions. Weekends and holidays still
count toward the calendar windows. Current thresholds are read from each JSON.

## Snapshot and display semantics

Both markets use the most recent **21:00 Asia/Seoul**. The Korean session on that
date is eligible; the same-date US regular session has not opened, so US prices
come from a prior trading date. Weekends and holidays use available sessions.

Market caps remain full numeric amounts in JSON and display as `₩675.22억`,
`₩2.59조`, `$10.58bn`, or `$2.5tn`. KRX caps use the anchor date. US estimates
are marked `≈`; unavailable caps show `—`. Currency symbols remain in market
caps and section descriptions, but **Raw History price cells omit them**.
US prices retain two decimal places; Korean prices use whole won. Normalized
prices are unitless, with each stock's first available close indexed to 100.

See [DATA.md](docs/DATA.md) for required fields, optional metadata, and limitations.

## Publication

The local Windows task `Momentum_Daily_Snapshot` runs at sign-in, resume, and
21:00 while the laptop is available. It publishes both result files together
after both screeners succeed, and skips a successfully published cutoff.
The laptop must be online with the user signed in; this is not a hosted data job.

GitHub Pages serves this repository's root from `main`. Data commits and frontend
commits deploy through Pages. Do not hand-edit generated result values. The
local project root README and operations guide document the private runner.

## Development

From this repository directory:

```powershell
python -m http.server 8000 --bind 127.0.0.1
git diff --check
node --check script.js
```

Open <http://127.0.0.1:8000>. `file://` does not support normal JSON fetching.
In the full local project, run `node --test test_frontend.cjs` from the parent
directory for route, failure, empty-state, and formatting regression checks.

Preserve the route names, result filenames, and DOM IDs used by `script.js`.
When changing CSS or JS behavior, update its asset query version in `index.html`.
Keep credentials, logs, local environments, research files, and private scripts
outside this public directory. See [DESIGN.md](docs/DESIGN.md) for presentation
conventions. The archived Apple analysis is historical inspiration only.
