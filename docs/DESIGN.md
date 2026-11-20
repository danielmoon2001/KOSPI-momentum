# Current frontend conventions

The source of truth is `index.html`, `style.css`, `script.js`, `history-dashboard.js`, `fx.js`, `commodities.js`, and `crypto-bonds.js`. The
dashboard has top-level Home, Equities, Indices, FX, Commodities, Crypto and Bonds sections; equity subroutes retain
their existing tables, thresholds, and tracking layout.

- Monochrome palette: white, parchment `#f5f5f7`, dark surface `#272729`, and ink
  `#1d1d1f`.
- Content is bounded to 1068 px, with a 52 px sticky grey navigation bar.
  Top-level links sit beside Moon Quixote, with an underline and `aria-current`
  on the active route. Equity sublinks occupy a second row only in that section.
  On narrow screens links wrap onto their own scrollable row.
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
- Tracking has a spacious title/subtitle and separated stock records. Compact
  headers show the found date, status/session count, and change since discovery.
  The history table contains every close and marks the first drop; the drop date
  and latest price are not repeated in the header. A chart appears after two closes.

Preserve these conventions during maintenance unless a design change is
requested. DOM IDs are shared hooks for the renderer and frontend checks.
Use explicit CSS/JS asset query versions for changes that affect appearance or
behavior. Keep provider data escaped before inserting names or symbols into HTML.

## Dashboard, FX and commodities

The home page uses six simple linked section cards. The five history dashboards retain the same content
width, white surfaces, restrained typography, and compact footer. Accent colors distinguish the closing rate, two moving averages and channel
boundaries; filter entries/exits also use different marker shapes.

Each chart has a range control with presets through 20Y/MAX, a numeric day
count and exact dates. Technical controls are in a native disclosure, start
off, and apply valid changes immediately.
Settings apply within each section; FX, Commodities, Crypto and Bonds settings are independent. Bond cards are grouped into Korea and United States, with maturity labels and total-return index points. Date controls use each instrument’s
available coverage. No earlier observations are synthesized.
The renderer and technical calculations are shared. Chart cards use two columns on desktop and
one on mobile. Charts retain readable minimum widths and scroll inside their
panels. Native details expose exact daily rates, indicator values and signals;
keyboard and touch access do not depend on hovering. Chart paths retain every
observation; only invisible hover targets are sampled for longer ranges.
There is no external chart library, browser API key or automatic order execution.

Equity indices use the shared history cards, grouped by country. Every history
chart starts at 1M (30 calendar days), independently adjustable.
