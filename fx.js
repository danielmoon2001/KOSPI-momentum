// Daily FX display: raw quotes remain KRW per one foreign-currency unit.
let fxState = { loading: true };
let fxRange = "3M";
const fxRanges = { "1D": 1, "1W": 7, "2W": 14, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };
const fxColors = ["#245db1", "#ad5135", "#6a4da2", "#24765c", "#bd760c", "#a53e70", "#437c93", "#676032"];
const fxHidden = new Set();
const fxPercent = value => value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
const fxNumber = value => new Intl.NumberFormat("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value);
const fxReturn = (history, offset) => history.length > offset ? (history.at(-1).close / history.at(-1 - offset).close - 1) * 100 : null;

function fxWindow(history, range = fxRange) {
  if (range === "1D") return history.slice(-2);
  const boundary = Date.parse(history.at(-1).date) - fxRanges[range] * 86400000;
  return history.filter(point => Date.parse(point.date) >= boundary);
}

function fxCommon(pairs) {
  const maps = pairs.map(pair => new Map(pair.history.map(point => [point.date, point.close])));
  const dates = pairs[0].history.map(point => point.date).filter(date => maps.every(map => map.has(date)));
  return pairs.map((pair, index) => ({...pair, history: dates.map(date => ({date, close: maps[index].get(date)}))}));
}

function fxMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// SVG uses actual date spacing. The table supplies precise daily values on touch/keyboard.
function fxChart(series, percent = false) {
  if (!series.length || series.some(line => line.points.length < 2)) return '<p class="fx-muted">Select a currency to compare.</p>';
  const points = series.flatMap(line => line.points);
  let low = Math.min(...points.map(p => p.value)), high = Math.max(...points.map(p => p.value));
  const pad = (high - low || Math.abs(high) * 0.01 || 1) * 0.12;
  low -= pad; high += pad;
  const first = Math.min(...points.map(p => Date.parse(p.date))), last = Math.max(...points.map(p => Date.parse(p.date)));
  const width = percent ? 800 : 480, right = width - 30;
  const x = date => 70 + (Date.parse(date) - first) / (last - first || 1) * (right - 70);
  const y = value => 20 + (high - value) / (high - low) * 200;
  const ticks = [0, 1, 2, 3, 4].map(i => {
    const value = low + (high - low) * i / 4, position = y(value);
    return `<line x1="70" y1="${position}" x2="${right}" y2="${position}" class="fx-gridline"/><text x="60" y="${position + 4}" text-anchor="end">${percent ? value.toFixed(1) + "%" : fxNumber(value)}</text>`;
  }).join("");
  const lines = series.map(line => `<polyline fill="none" stroke="${line.color}" stroke-width="2" points="${line.points.map(p => `${x(p.date)},${y(p.value)}`).join(" ")}"/>${line.points.map(p => `<circle cx="${x(p.date)}" cy="${y(p.value)}" r="4" fill="${line.color}" class="fx-point"><title>${escapeHTML(line.label)} · ${p.date}: ${percent ? fxPercent(p.value) : "₩" + fxNumber(p.value)}</title></circle>`).join("")}`).join("");
  return `<div class="fx-chart-scroll"><svg class="fx-chart${percent ? " fx-comparison" : ""}" viewBox="0 0 ${width} 255" role="img" aria-label="${escapeHTML(series.map(s => s.label).join(", "))}: ${percent ? "percentage change" : "KRW daily reference rates"}. Exact values in the daily tables.">${ticks}${percent && low <= 0 && high >= 0 ? `<line x1="70" y1="${y(0)}" x2="${right}" y2="${y(0)}" class="fx-zero"/>` : ""}${lines}<text x="70" y="247">${new Date(first).toISOString().slice(0,10)}</text><text x="${right}" y="247" text-anchor="end">${new Date(last).toISOString().slice(0,10)}</text></svg></div>`;
}

function renderFX() {
  const container = $("#fx-content");
  if (fxState.loading || fxState.error) {
    container.innerHTML = `<p class="empty-state">${fxState.loading ? "Loading daily FX rates…" : "FX data is unavailable. Please try again later."}</p>`;
    $("#asof").textContent = fxState.loading ? "Loading…" : "FX unavailable";
    return;
  }
  const data = fxState.data;
  $("#asof").textContent = `Updated ${formatUpdated(data.generatedAt, true)}`;
  $("#fx-updated").textContent = `Snapshot: ${formatSnapshot(data.snapshotAt)} · Source: Yahoo Finance.`;
  const common = fxCommon(data.pairs);
  const selected = common.map(pair => ({...pair, history: fxWindow(pair.history)}));
  const comparison = selected.filter(pair => !fxHidden.has(pair.code)).map(pair => ({label: pair.code, color: fxColors[data.pairs.findIndex(p => p.code === pair.code)],
    points: pair.history.map(p => ({date: p.date, value: (p.close / pair.history[0].close - 1) * 100}))}));
  const fiveDay = common.map(pair => fxReturn(pair.history, 5));
  const median = fxMedian(fiveDay);
  const comparisonDates = selected[0].history;
  container.innerHTML = `<section class="fx-panel"><div class="fx-section-heading"><div><h2>Relative movement</h2><p class="fx-muted">Change from the first shared date · ${comparisonDates[0].date} — ${comparisonDates.at(-1).date}</p></div></div>
    <div class="fx-legend" aria-label="Currencies shown in comparison">${data.pairs.map((pair, i) => `<button type="button" data-currency="${pair.code}" aria-pressed="${!fxHidden.has(pair.code)}" style="--pair-color:${fxColors[i]}"><span></span>${pair.code}</button>`).join("")}</div>
    ${fxChart(comparison, true)}
    <details class="fx-details"><summary>Momentum comparison · 1 / 5 / 20 observations</summary><p class="fx-muted">5D relative = currency’s five-observation return minus the median of these eight currencies, in percentage points. Shared dates only; descriptive, not a forecast.</p>
    <div class="table-container"><table class="fx-table"><caption>Common observation date: ${common[0].history.at(-1).date}. D means daily observations, excluding missing dates.</caption><thead><tr><th>Currency</th><th>1D</th><th>5D</th><th>20D</th><th>5D relative</th></tr></thead><tbody>${common.map((pair, i) => `<tr><th scope="row">${pair.code}</th><td>${fxPercent(fxReturn(pair.history, 1))}</td><td>${fxPercent(fiveDay[i])}</td><td>${fxPercent(fxReturn(pair.history, 20))}</td><td>${(fiveDay[i] - median) >= 0 ? "+" : ""}${(fiveDay[i] - median).toFixed(2)} pp</td></tr>`).join("")}</tbody></table></div></details></section>
    <div class="fx-pairs">${data.pairs.map((pair, index) => {
      const history = fxWindow(pair.history), last = history.at(-1);
      const selectedChange = (last.close / history[0].close - 1) * 100;
      const line = {label: `${pair.displayUnits} ${pair.code} in KRW`, color: fxColors[index], points: history.map(p => ({date: p.date, value: p.close * pair.displayUnits}))};
      return `<article class="fx-panel fx-pair"><div class="fx-pair-heading"><div><h2>${pair.code} / KRW</h2><p class="fx-muted">${escapeHTML(pair.name)} · ${pair.displayUnits} ${pair.code}</p></div><div class="fx-quote"><strong>₩${fxNumber(last.close * pair.displayUnits)}</strong><span>${pair.asOf}</span></div></div>
      <div class="fx-stats"><span>1D <strong>${fxPercent(fxReturn(pair.history, 1))}</strong></span>${fxRange === "1D" ? "" : `<span>${fxRange} <strong>${fxPercent(selectedChange)}</strong></span>`}</div>
      ${fxChart([line])}<details class="fx-details"><summary>Daily rates · ${history.length} observations</summary><div class="table-container"><table class="fx-table"><caption>KRW per ${pair.displayUnits} ${pair.code} · selected range</caption><thead><tr><th>Date</th><th>Rate (₩)</th><th>Daily change</th></tr></thead><tbody>${[...history].reverse().map(point => {
        const position = pair.history.findIndex(p => p.date === point.date);
        const change = position ? (point.close / pair.history[position - 1].close - 1) * 100 : null;
        return `<tr><th scope="row">${point.date}</th><td>${fxNumber(point.close * pair.displayUnits)}</td><td>${fxPercent(change)}</td></tr>`;
      }).join("")}</tbody></table></div></details></article>`;
    }).join("")}</div>`;
}

function validateFX(data) {
  const expected = ["USD", "EUR", "JPY", "GBP", "CNY", "CHF", "AUD", "CAD"];
  const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
  if (data.schemaVersion !== 1 || data.quoteCurrency !== "KRW" || !data.generatedAt || !data.snapshotAt
      || !Array.isArray(data.pairs) || data.pairs.length !== expected.length
      || data.pairs.some((pair, index) => pair.code !== expected[index] || pair.displayUnits !== (pair.code === "JPY" ? 100 : 1)
        || !Array.isArray(pair.history) || pair.history.length < 21 || pair.asOf !== pair.history.at(-1).date
        || pair.history.some((point, i) => !validDate(point.date) || point.date >= data.snapshotAt.slice(0,10)
          || !Number.isFinite(point.close) || point.close <= 0 || (i > 0 && point.date <= pair.history[i-1].date)))
      || fxCommon(data.pairs)[0].history.length < 21) throw new Error("Invalid FX payload");
}

async function loadFX() {
  try {
    const response = await fetch(`data/fx.json?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    validateFX(data);
    fxState = {data, loading: false};
  } catch (error) {
    console.error("FX:", error);
    fxState = {error: true, loading: false};
  }
  syncView();
}

function initFX() {
  $("#fx-range").addEventListener("change", event => { fxRange = event.target.value; renderFX(); });
  $("#fx-content").addEventListener("click", event => {
    const button = event.target.closest("button[data-currency]");
    if (!button) return;
    const code = button.dataset.currency;
    if (fxHidden.has(code)) fxHidden.delete(code); else fxHidden.add(code);
    renderFX();
    document.querySelector(`button[data-currency="${code}"]`)?.focus();
  });
  loadFX();
}
