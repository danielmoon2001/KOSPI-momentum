# Current frontend conventions

The source of truth is `index.html`, `style.css`, `script.js`, `home.js`, `history-dashboard.js`, `fx.js`, `commodities.js`, `crypto-bonds.js`, `bond-rates.js`, `indices.js`, and `metrics.js`. The
dashboard has top-level Home, Equities, Indices, FX, Commodities, Crypto, Bonds and Metrics sections; equity subroutes retain
their desktop tables and thresholds. Tracking records are grouped by market.

- Monochrome palette: white, parchment `#f5f5f7`, dark surface `#272729`, and ink
  `#1d1d1f`.
- Content is bounded to 1068 px, with a 52 px sticky grey navigation bar.
  Top-level links sit beside Moon Quixote, with an underline and `aria-current`
  on the active route. Equity sublinks occupy a second row only in that section.
  On phones, native section and equity-page selectors replace the link rows.
- The overview uses a two-column hero above 860 px and one column below it.
  Five lightweight links show the market/tracking label, arrow, and count.
- The shared market view contains a dark summary, light raw history, parchment
  normalized history, and a compact source/date footer.
- Four criteria use content-width columns with equal intervening gaps. The final
  item aligns to the right edge. At 768 px and below, they become a two-column grid.
- Criteria show volume, price, evaluation length/unit, and base length/unit.
  Current results use three evaluation trading days and five base calendar
  days. Older result files retain their original calendar-day labels.
- History tables have 32 px separation from their descriptions and scroll
  horizontally when necessary.
- Caps appear below stock names as compact values, with an accessible label and
  hover title rather than repeating a visible label in every column. Values
  use at most one decimal place and KRW 억/조 or USD bn/tn units.
- Raw price cells omit currency symbols; descriptions and caps retain units.
- Footers use 12 px text and 20 px vertical padding. Note groups spread across
  the content width with space between them and wrap with 8 px row gaps on
  smaller screens. Empty notes are hidden.
- The overview introduces equity breakout screeners across four markets. The Korean
  universe remains explicitly identified as KOSPI 200 in its subtitle/footer.
- The overview explains screening and subsequent tracking in two short paragraphs.
- Tracking groups visible records in KOSPI, US, Japan, Hong Kong order, omitting
  empty groups. Each group shows its count and market observation date. Compact
  headers show the found date, status/session count, and change since discovery.
  The history table contains every close and marks the first drop; the drop date
  and latest price are not repeated in the header. A chart appears after two closes.

## Phone interface (760 px and below)

Phones prioritize levels, changes, dates and controls. Introductory paragraphs,
hero artwork, criteria strip and footer disclaimers are hidden; the desktop copy
remains unchanged. Units, observation dates, errors and delayed/unavailable labels
remain visible. Home retains its numerical summaries with tighter spacing.

Equity matches use compact stock cards with latest close, cap and both screening
ratios instead of the desktop summary table. Raw and normalized history remain
available below, with currency and normalization labels. Tracking shows the latest
close beside its date; full price history is a collapsed native disclosure. Desktop
tracking history stays expanded. Grouping does not alter episode visibility or counts.

Metric explanations are collapsed under **How to read** on phones and expanded by
default on desktop. Range controls and technical settings remain functional and
retain their existing defaults. Resizing rerenders chart/tracking disclosures for
the new breakpoint; chart selections and indicator settings are preserved.

Preserve these conventions during maintenance unless a design change is
requested. DOM IDs are shared hooks for the renderer and frontend checks.
Use explicit CSS/JS asset query versions for changes that affect appearance or
behavior. Keep provider data escaped before inserting names or symbols into HTML.

## Dashboard, FX and commodities

Home uses a numerical market-pulse strip followed by six compact summary panels.
Each panel header links to its full section. Selected latest levels, daily changes,
units and observation dates provide the overview; there are no homepage charts.
The Bonds summary includes BOK, Korea 3Y/10Y, the Fed target range and US 2Y/10Y
above selected total-return indices. Rates show percent levels and bp changes.
The Bonds page places two responsive country panels above the index charts;
the target range and effective fed funds rate are explicitly distinct. Source
dates and delayed/unavailable states stay visible. No rate charts are added.
Match and tracking counts remain distinct. Metric deltas use absolute units, and
delayed/unavailable labels remain visible. Panels use three desktop columns, two
at intermediate widths and one on phones; the pulse strip wraps its five metrics.
The five history dashboards retain the same content
width, white surfaces, restrained typography, and compact footer. Accent colors distinguish the closing rate, two moving averages and channel
boundaries; filter entries/exits also use different marker shapes.

Each chart has a range control with presets through 20Y/MAX, a numeric day
count and exact dates. Technical controls are in a native disclosure, start
off, and apply valid changes immediately.
Settings apply within each section; Indices, FX, Commodities, Crypto and Bonds settings are independent. Bond cards are grouped into Korea and United States, with maturity labels and total-return index points. Date controls use each instrument’s
available coverage. No earlier observations are synthesized.
The renderer and technical calculations are shared. Chart cards use two columns on desktop and
one on mobile. Charts scale to each panel with no fixed minimum width or horizontal chart scrolling.
Phone layouts use a landscape SVG (height about 62% of width), a 42-unit left axis
margin and 8-unit right margin, compact axis values and month/day labels. Panel
horizontal padding is 12 px. Desktop chart geometry remains 480 × 255;
full dates and exact values remain in daily tables. Tables retain horizontal scrolling. Native details expose exact daily rates, indicator values and signals;
keyboard and touch access do not depend on hovering. Chart paths retain every
observation; only invisible hover targets are sampled for longer ranges.
There is no external chart library, browser API key or automatic order execution.

Equity indices use the shared history cards, grouped by country. Every history
chart starts at 1M (30 calendar days), independently adjustable.

Metrics shares the chart cards and range controls, with no trading-indicator form.
It shows absolute changes, per-source observation dates and explicit delayed/unavailable states.
Each metric includes a short definition and interpretation, documented in [Metrics](METRICS.md).
