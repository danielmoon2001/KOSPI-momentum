# Moon Quixote · Asset Dashboard

A static dashboard designed by Moon Quixote.
[Open the live site](https://danielmoon2001.github.io/KOSPI-momentum/).

Vanilla HTML, CSS, and JavaScript; no frontend framework, build step, or browser
API credentials. This repository contains the **public website and generated
results**. The private local screeners, market-history fetchers, and Windows task installation live outside
this Git repository and are not included in a clone.

## Repository layout

```text
index.html                  Dashboard home, equities, FX, commodities, crypto and bonds
style.css                   Layout, typography, tables, responsive criteria
script.js                   Routing, result loading, formatting, rendering
fx.js                       FX validation and display configuration
commodities.js              Futures validation and display configuration
crypto-bonds.js              Crypto and government-bond ETF configuration
history-dashboard.js        Shared charts, controls and daily signal tables
fx-analysis.js              Shared close-based indicators and filter rules
hero_image.png              Hero illustration
data/results.json           Generated Korean results
data/results-us.json        Generated US results
data/tracking.json          Persistent tracking episodes and full price histories
data/fx.json                Daily KRW histories for eight major currencies
data/commodities.json       Daily prices for nine major commodity futures
data/crypto.json            Bitcoin and Ethereum daily USD closes
data/bonds.json             Nine Korean/US government-bond ETF histories
docs/DATA.md                JSON contract and data semantics
docs/DESIGN.md              Current design conventions
```

## Views

| Route | Content |
| --- | --- |
| `#home` (also default URL) | Dashboard entry point: Equities, FX and Commodities |
| `#commodities` | Nine major futures markets: charts, technical rules and daily prices |
| `#crypto` | Bitcoin and Ethereum daily USD charts and technical rules |
| `#bonds` | Korean/US government-bond ETF prices grouped by country and maturity |
| `#fx` | Major currencies against KRW: charts, technical rules, daily observations |
| `#overview`, `#equities` | Equity introduction, market links, counts, and snapshot notes |
| `#KOSPImatches` | KOSPI 200 matches, raw prices, and normalized history |
| `#USmatches` | Nasdaq-100 / S&P 500 matches, raw prices, and normalized history |
| `#tracking` | Korean and US discoveries followed through their first lower close |
| `#matches` | Compatibility alias for the Korean view |

The top-right date is the result fetch date in Korea time. Footer notes show the
snapshot cutoff and actual closing-data dates, which can differ between markets.
Each market loads independently: a failed or empty response does not prevent
the other market from displaying.

The sticky grey bar contains Dashboard, Equities, FX and Commodities beside Moon Quixote.
Within Equities, a second navigation row exposes the four existing equity views. Overview
links use compact text, arrows, and counts. The active navigation link is
underlined. Tracking retains the same dark-page typography and table style.

Tracking starts with each stock's discovery close and counts subsequent trading
sessions with equal or higher closes. The first lower close is included in the
history but is not counted as survived. Completed episodes stay visible through
that market session, then leave the view on the next session. Volume and window
ratios are not retested. Repeated matches do not reset active episodes; a new
match after completion can begin a new episode. Histories show every session
from discovery to the first drop, with a chart once two closes are available.

Tracking launched November 15, 2026, seeded from the latest published matches;
it does not claim to reconstruct older discoveries. Match pages continue to
show the current screen independently. Completed episodes remain in JSON for
audit even after leaving the tracking view.

## Screening contract

- Evaluation: **3 trading dates**, ending on the latest eligible session.
- Base: **5 calendar days** immediately before the first evaluation date.
- Evaluation average daily volume / base average daily volume **> 1.5**.
- Final evaluation close / base average close **> 1.1**.
- Last three trading-session closes strictly increase.
- Korea: **KOSPI 200**, pykrx index `1028`, with membership on the anchor date.
- US: **Nasdaq-100 ∪ S&P 500**, using index-list revisions at or before the cutoff.

The local screeners apply these rules; the website only renders generated data.
Daily volume averages use actual trading sessions. Weekends and holidays count
toward the base's calendar span but not toward the three evaluation sessions.
Current thresholds are read from each JSON. This window definition applies to
new runs from November 17, 2026; earlier saved snapshots use the former two
five-calendar-day windows. The overview describes the current rule; each match
page labels the windows used by its actual payload. Earlier snapshots show a
brief historical-rule note until a new update replaces them.

## Snapshot and display semantics

Both markets use the most recent **21:00 Asia/Seoul**. The Korean session on that
date is eligible; the same-date US regular session has not opened, so US prices
come from a prior trading date. Weekends and holidays use available sessions.

Market caps remain full numeric amounts in JSON and display as `₩675.2억`,
`₩2.6조`, `$10.6bn`, or `$2.5tn`. KRX caps use the anchor date. US estimates
are marked `≈`; unavailable caps show `—`. Currency symbols remain in market
caps and section descriptions, but **Raw History price cells omit them**.
US prices retain two decimal places; Korean prices use whole won. Normalized
prices are unitless, with each stock's first available close indexed to 100.

See [DATA.md](docs/DATA.md) for required fields, optional metadata, and limitations.

## FX monitoring

FX uses the same snapshot cutoff and excludes that day's unfinished daily bar.
USD, EUR, JPY, GBP, CNY, CHF, AUD, and CAD are shown in KRW (JPY per 100 yen).
Yahoo Finance supplies daily history; CNY uses matching USD/KRW and USD/CNY
observations. Presets span 1D through 5Y, with custom calendar-day lookbacks and
exact start/end dates. The initial range is 3M. Configurable simple moving averages,
prior-close support/resistance channels and percentage filter rules annotate each
chart; daily tables expose rates, indicators, thresholds, and position changes.
See [technical rules](docs/FX-RULES.md) for exact semantics and
[FX data semantics](docs/DATA.md#fx-history-datafxjson) for the data contract.

Reference rates omit conversion fees/spreads and are not executable bank quotes.

## Commodity futures

Gold, silver, copper, WTI/Brent crude oil, natural gas, wheat, corn and soybeans
use Yahoo futures series. Each chart retains its quoted unit: dollars per troy
ounce, pound, barrel or MMBtu, and **US cents per bushel** for grains. Copper,
silver and natural gas retain extra display precision. No KRW conversion is applied.

The page reuses FX's ranges and technical tools with separate settings. These
series can switch contracts; rolls can affect charts and signals. This dashboard
applies no additional roll adjustment or spot-price reconstruction. See
[commodity methodology](docs/COMMODITIES.md) for sources, units and limitations.

## Publication

The local Windows task `Momentum_Daily_Snapshot` runs at sign-in, resume, and
21:00 while the laptop is available. It publishes both equity results, tracking,
FX, commodities, crypto and bond ETFs together after all seven outputs succeed, and skips a completed cutoff.
The laptop must be online with the user signed in; this is not a hosted data job.

GitHub Pages serves this repository's root from `main`. Data commits and frontend
commits deploy through Pages. Do not hand-edit generated result values. The
local project root README and operations guide document the private runner.

Crypto (`#crypto`) contains BTC and ETH in USD. Government Bonds (`#bonds`)
contains three Korean and six US ETF maturity exposures, grouped by country.
Both share the chart tools with independent settings. ETF closes are prices,
not yields or total returns; distributions affect price signals. See
[instruments and methodology](docs/CRYPTO-BONDS.md).

## Development

From this repository directory:

```powershell
python -m http.server 8000 --bind 127.0.0.1
git diff --check
node --check script.js
node --check fx.js
node --check fx-analysis.js
node --check history-dashboard.js
node --check commodities.js
node --check crypto-bonds.js
```

Open <http://127.0.0.1:8000>. `file://` does not support normal JSON fetching.
In the full local project, run `node --test test_frontend.cjs` from the parent
directory for route, failure, empty-state, and formatting regression checks.

Preserve the route names, result filenames, and DOM IDs used by `script.js`.
When changing CSS or JS behavior, update its asset query version in `index.html`.
Keep credentials, logs, local environments, research files, and private scripts
outside this public directory. See [DESIGN.md](docs/DESIGN.md) for presentation
conventions.
