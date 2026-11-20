# Public website maintenance

Read README.md and docs/DATA.md before changing rendering or payload assumptions.
This is a standalone static checkout, not the private backend installation.

- Run `node tools/check.cjs` with Node 22+; no npm dependencies are required.
- Preserve route names, DOM hooks, payload filenames and the Korean/US equity layout
  unless asked to change them. All history charts start at 1M with indicators off.
- Preview this directory over HTTP. Verify real browser layout for visual changes;
  the regression suite uses a simulated DOM.
- Treat data/ as generated output. tracking.json is persistent state, not disposable.
- Keep credentials, logs, research PDFs and private Python source outside this repo.
- Bump CSS/JS query versions in index.html for appearance/behavior changes.
- Check both Website checks and Pages deployment after publication; neither a local
  test nor a successful push alone proves the live site updated.
