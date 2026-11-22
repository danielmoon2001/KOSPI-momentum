# Moon Quixote · Asset Dashboard

[Live dashboard](https://danielmoon2001.github.io/KOSPI-momentum/), designed by Moon Quixote.
Static HTML, CSS and JavaScript, with no framework, build step or browser credentials.
This repository contains the public website and generated data. The private Python
backend and Windows task live outside this repository; a clone cannot fetch updates.

## Sections

| Route | Content |
| --- | --- |
| #home (default) | Seven dashboard sections |
| #overview / #equities | Equity introduction and market links |
| #KOSPImatches / #matches | KOSPI 200 screen; second route is a legacy alias |
| #USmatches | Nasdaq-100 ∪ S&P 500 screen |
| #JapanMatches | Nikkei 225 screen |
| #HKmatches | Hang Seng Index screen |
| #tracking | Discoveries through the first lower close |
| #indices | Nine major price indices across the four markets |
| #fx | Eight major currencies against KRW; JPY per 100 yen |
| #commodities | Nine futures series in their quoted USD/US-cent units |
| #crypto | Bitcoin and Ethereum in USD |
| #metrics | VIX, MOVE, Cboe total put/call, high-yield OAS and CNN Fear & Greed |
| #bonds | Four Korean KAP and five US Solactive government-bond total-return indices |

History charts start at 1M (30 calendar days). Each chart has presets, custom day
counts and exact dates. Indicators start off; valid settings apply immediately.
Simple moving averages, prior-close channels and percentage filter rules use the
full available history before chart clipping. Settings are independent by section.
[Technical rules](docs/FX-RULES.md).

## Equity rules and tracking

The base window is five calendar days immediately before the latest three trading
dates (evaluation). A match requires evaluation/base average volume > 1.5, final
close/base average close > 1.1, and three strictly increasing evaluation closes.
The private screeners apply these rules; this website renders their output.
Thresholds/window metadata come from JSON. Historical payloads retain their own labels.

Tracking starts at discovery with zero survived sessions. Flat or higher subsequent
closes continue it. The first lower close ends it and remains visible through that
market session, without counting as survived. Completed records remain in JSON.
Repeat matches do not reset an active episode; later matches may begin new episodes.
Tracking began November 15, 2026; older discoveries are not reconstructed.

## Data and display

One local Windows task publishes eleven datasets using the most recent 21:00 KST.
Asian equities may use that day's completed session; US equities use a prior date.
Provider observation dates and cutoff timestamps are separate. See [data contract](docs/DATA.md).
The laptop must be available, signed in and online. This is not a cloud data job.

Caps use compact units with at most one decimal place; approximate caps are marked
and unavailable values remain missing. Raw History cells omit currency symbols;
section labels and caps retain units. Normalized prices start at 100.

FX rates omit conversion spreads; futures can roll contracts; equity indices are
price indices; bond indices include reinvested interest. Some bond history predates
index launch and is backtested. These are reference charts, not executable quotes
or a measured trading strategy. Source details: [commodities](docs/COMMODITIES.md),
[crypto/bonds](docs/CRYPTO-BONDS.md), [indices](docs/INDICES.md).

## Files

| Files | Purpose |
| --- | --- |
| index.html, style.css, script.js | Routes, layout and equity/tracking renderer |
| history-dashboard.js, fx-analysis.js | Shared charts, controls and calculations |
| fx.js, commodities.js, crypto-bonds.js, indices.js, metrics.js | Section adapters and validation |
| hero_image.png, .nojekyll | Static illustration and Pages configuration |
| data/results*.json | Four equity result files |
| data/tracking.json | Persistent episodes and histories |
| data/fx.json, commodities.json, crypto.json, bonds.json, indices.json | Five history datasets |
| data/metrics.json | Five independently dated risk/sentiment series |
| tests/frontend.test.cjs, tools/check.cjs | Self-contained offline verification |
| .github/workflows/checks.yml | Public regression CI |
| docs/ | Contracts, design and methodology |

## Contributing

Node 22 or later; no npm install is needed. From this repository:

```powershell
node tools/check.cjs
python -m http.server 8000 --bind 127.0.0.1
git diff --check
```

The check command verifies JavaScript syntax, local HTML asset references, unique
IDs, JSON parsing/timestamps and frontend regression cases. Tests use a simulated
DOM; inspect affected routes in a real browser for layout changes. Serve this
repository only, never a private parent folder. file:// does not support normal fetches.

Preserve routes, filenames and DOM hooks. Do not hand-edit generated values or
reset tracking state. Follow [design conventions](docs/DESIGN.md); keep the
handcrafted Korean/US views unchanged during unrelated work. Bump asset query
versions in index.html for CSS/JS changes. Never add credentials, logs or private source.

GitHub Pages serves main's root. Website checks runs separately on pushes and pull
requests; it does not gate the existing branch-based Pages deployment. After a
push verify both workflows and the live page. Backend setup/recovery belongs to
the private project's onboarding and operations guides.

Metrics uses absolute changes and displays OAS in basis points. Source failures
are labeled per card and do not block the other updates. See [Metrics methodology](docs/METRICS.md).
Charts fit the full mobile width without sideways scrolling; exact data tables may
still scroll. Phone rotation recalculates chart geometry and preserves range selections.
