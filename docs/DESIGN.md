# Current frontend conventions

The source of truth is `index.html`, `style.css`, `script.js`, and `fx.js`. The
dashboard has top-level Home, Equities, and FX sections; equity subroutes retain
their existing tables, thresholds, and tracking layout.

- Monochrome palette: white, parchment `#f5f5f7`, dark surface `#272729`, and ink
  `#1d1d1f`.
- Content is bounded to 1068 px, with a 52 px sticky grey navigation bar.
  Top-level links sit beside Moon Quixote, with an underline and `aria-current`
  on the active route. Equity sublinks occupy a second row only in that section.
  On narrow screens links wrap onto their own scrollable row.
- The overview uses a two-column hero above 860 px and one column below it.
  Three lightweight links show the market/tracking label, arrow, and count.
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
- The current title line is “Korea & US Equity breakout screeners.” The Korean
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

## Dashboard and FX

The home page uses two simple linked section cards. FX retains the same content
width, white surfaces, restrained typography, and compact footer. Its only
accent colors identify currencies consistently across charts and legends.

A shared range selector controls the comparison and all pair charts. The
comparison legend toggles lines with keyboard-accessible buttons. Pair cards
use two columns on desktop and one on mobile. Charts retain readable minimum
widths and scroll within their panels on small screens. Native details/summary
elements expose momentum calculations and daily data tables; exact values do
not require pointer hover. There is no external chart library or browser API key.
