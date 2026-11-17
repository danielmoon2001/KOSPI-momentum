# Current frontend conventions

The source of truth is `index.html`, `style.css`, and `script.js`. These
conventions describe the current four-route dashboard.

- Monochrome palette: white, parchment `#f5f5f7`, dark surface `#272729`, and ink
  `#1d1d1f`.
- Content is bounded to 1068 px, with a 52 px sticky grey navigation bar.
  Links sit beside Momentum, with an underline and `aria-current` on the active
  route. On narrow screens the links wrap onto their own scrollable row.
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
- Footers use 12 px text, 20 px vertical padding, inline wrapping notes, and subtle
  separators. Empty notes are hidden.
- The current title line is “Korea & US Equity breakout screeners.” The Korean
  universe remains explicitly identified as KOSPI 200 in its subtitle/footer.
- Tracking has a spacious title, subtitle, introduction, and separated stock
  records. Each record shows the found date, status/count, price change, and
  every close through the first drop. A chart appears after two closes.

Preserve these conventions during maintenance unless a design change is
requested. DOM IDs are shared hooks for the renderer and frontend checks.
Use explicit CSS/JS asset query versions for changes that affect appearance or
behavior. Keep provider data escaped before inserting names or symbols into HTML.
