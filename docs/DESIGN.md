# Current frontend conventions

The source of truth is `index.html`, `style.css`, and `script.js`. This document
describes the deployed design; the [archived Apple analysis](archive/DESIGN-apple-template.md)
is historical inspiration and contains unused colors, components, and tokens.

- Monochrome palette: white, parchment `#f5f5f7`, dark surface `#272729`, and ink
  `#1d1d1f`. Buttons use ink rather than the archive's blue accent.
- Content is bounded to 1068 px, with a 52 px sticky navigation bar.
- The overview uses a two-column hero above 860 px and one column below it.
- The shared market view contains a dark summary, light raw history, parchment
  normalized history, and a compact disclaimer footer.
- Four criteria use content-width columns with equal intervening gaps. The final
  item aligns to the right edge. At 768 px and below, they become a two-column grid.
- History tables have 32 px separation from their descriptions and scroll
  horizontally when necessary.
- Caps appear below stock names as compact values, with an accessible label and
  hover title rather than repeating a visible label in every column.
- Raw price cells omit currency symbols; descriptions and caps retain units.
- Footers use 12 px text, 20 px vertical padding, inline wrapping notes, and subtle
  separators. Empty notes are hidden.
- The current title line is “Korea & US Equity breakout screeners.” The Korean
  universe remains explicitly identified as KOSPI 200 in its subtitle/footer.

Preserve these conventions during maintenance unless a design change is
requested. DOM IDs are shared hooks for the renderer and frontend checks.
Use explicit CSS/JS asset query versions for changes that affect appearance or
behavior. Keep provider data escaped before inserting names or symbols into HTML.
