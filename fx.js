// Daily FX display; indicator calculations are kept in fx-analysis.js.
let fxState = { loading: true };
let fxRange = '3M', fxDays = 90, fxStart = '', fxEnd = '';
let fxSettings = {...fxDefaults};
const fxRanges = {'1D':1,'1W':7,'2W':14,'1M':30,'3M':90,'6M':180,'1Y':365,'2Y':730,'3Y':1095,'5Y':1825};
const fxPercent = value => value == null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const fxNumber = value => new Intl.NumberFormat('en-US', {minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
const fxDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;

function fxWindow(history, range = fxRange) {
  if (!history.length) return [];
  if (range === 'dates') return history.filter(p => p.date >= fxStart && p.date <= fxEnd);
  if (range === '1D') return history.slice(-2);
  const boundary = Date.parse(history.at(-1).date) - (range === 'custom' ? fxDays : fxRanges[range]) * 86400000;
  return history.filter(p => Date.parse(p.date) >= boundary);
}

// Full-resolution paths, sampled hover targets; tables expose every exact value.
function fxChart(history, units) {
  const series = [{label:'Close',key:'close',color:'#245db1'}];
  if (fxSettings.averages) series.push({label:`SMA ${fxSettings.fast}`,key:'fast',color:'#ad5135'}, {label:`SMA ${fxSettings.slow}`,key:'slow',color:'#6a4da2'});
  if (fxSettings.bands) series.push({label:'Support',key:'support',color:'#24765c',dash:true}, {label:'Resistance',key:'resistance',color:'#a53e70',dash:true});
  const values = series.flatMap(line => history.filter(p => p[line.key] !== null).map(p => p[line.key] * units));
  let low = Math.min(...values), high = Math.max(...values);
  const pad = (high - low || Math.abs(high) * 0.01 || 1) * 0.12;
  low -= pad; high += pad;
  const first = Date.parse(history[0].date), last = Date.parse(history.at(-1).date);
  const x = date => 70 + (Date.parse(date) - first) / (last - first || 1) * 380;
  const y = value => 20 + (high - value * units) / (high - low) * 200;
  const ticks = [0,1,2,3,4].map(i => {
    const value = low + (high - low) * i / 4, position = y(value / units);
    return `<line x1="70" y1="${position}" x2="450" y2="${position}" class="fx-gridline"/><text x="60" y="${position + 4}" text-anchor="end">${fxNumber(value)}</text>`;
  }).join('');
  const lines = series.map(line => `<polyline fill="none" stroke="${line.color}" stroke-width="${line.key === 'close' ? 2 : 1.4}" ${line.dash ? 'stroke-dasharray="4 3"' : ''} points="${history.filter(p => p[line.key] !== null).map(p => `${x(p.date)},${y(p[line.key])}`).join(' ')}"/>`).join('');
  const step = Math.max(1, Math.ceil(history.length / 150));
  const hover = history.filter((p,i) => i % step === 0 || i === history.length - 1).map(p => `<circle cx="${x(p.date)}" cy="${y(p.close)}" r="5" class="fx-point"><title>${p.date} · ₩${fxNumber(p.close * units)}</title></circle>`).join('');
  const markers = history.map(p => {
    const px = x(p.date), py = y(p.close);
    let result = '';
    if (fxSettings.bands && ['Up','Down'].includes(p.breakout)) result += `<circle cx="${px}" cy="${py}" r="4" fill="white" stroke="#646a73"><title>${p.date} · ${p.breakout} channel breakout</title></circle>`;
    if (fxSettings.filter && p.signal) {
      const up = p.signal === 'Long', down = p.signal === 'Short';
      result += `<path d="${up ? `M${px},${py - 6}l-5,10h10z` : down ? `M${px},${py + 6}l-5,-10h10z` : `M${px},${py - 5}l-5,5l5,5l5,-5z`}" fill="${up ? '#24765c' : down ? '#a53e70' : '#6b7077'}"><title>${p.date} · Filter: ${p.signal}</title></path>`;
    }
    return result;
  }).join('');
  const endpoint = history.at(-1);
  return `<div class="fx-chart-scroll"><svg class="fx-chart" viewBox="0 0 480 255" role="img" aria-label="Daily KRW closes and selected technical indicators. Exact values and signals in the daily table.">${ticks}${lines}${hover}${markers}<circle cx="${x(endpoint.date)}" cy="${y(endpoint.close)}" r="2.5" fill="#245db1"/><text x="70" y="247">${history[0].date}</text><text x="450" y="247" text-anchor="end">${endpoint.date}</text></svg></div>
    <div class="fx-chart-key">${series.map(line => `<span><i style="background:${line.color}"></i>${line.label}</span>`).join('')}${fxSettings.filter ? '<span>▲ Long · ▼ Short · ◆ Exit</span>' : ''}${fxSettings.bands ? '<span>○ Channel breakout</span>' : ''}</div>`;
}

function fxTable(history, pair) {
  const amount = value => value === null ? '—' : fxNumber(value * pair.displayUnits);
  return `<details class="fx-details"><summary>Daily rates &amp; signals · ${history.length} observations</summary><div class="table-container"><table class="fx-table"><caption>KRW per ${pair.displayUnits} ${pair.code} · selected range · newest first</caption>
    <thead><tr><th>Date</th><th>Rate (₩)</th><th>Change</th><th>SMA ${fxSettings.fast}</th><th>SMA ${fxSettings.slow}</th><th>Support</th><th>Resistance</th><th>Channel</th><th>FR state</th><th>FR signal</th><th>FR upper</th><th>FR lower</th></tr></thead>
    <tbody>${[...history].reverse().map(p => `<tr><th scope="row">${p.date}</th><td>${amount(p.close)}</td><td>${fxPercent(p.change)}</td><td>${amount(p.fast)}</td><td>${amount(p.slow)}</td><td>${amount(p.support)}</td><td>${amount(p.resistance)}</td><td>${p.breakout}</td><td>${p.state}</td><td>${p.signal || '—'}</td><td>${amount(p.upper)}</td><td>${amount(p.lower)}</td></tr>`).join('')}</tbody></table></div></details>`;
}

function renderFX() {
  const container = $('#fx-content');
  if (fxState.loading || fxState.error) {
    container.innerHTML = `<p class="empty-state">${fxState.loading ? 'Loading daily FX rates…' : 'FX data is unavailable. Please try again later.'}</p>`;
    $('#asof').textContent = fxState.loading ? 'Loading…' : 'FX unavailable';
    return;
  }
  const data = fxState.data;
  $('#asof').textContent = `Updated ${formatUpdated(data.generatedAt, true)}`;
  $('#fx-updated').textContent = `Snapshot: ${formatSnapshot(data.snapshotAt)} · Source: Yahoo Finance.`;
  const earliest = data.pairs.map(p => p.history[0].date).sort().at(-1), latest = data.pairs.map(p => p.asOf).sort().at(-1);
  $('#fx-coverage').textContent = `Available history: ${earliest} — ${latest}. Periods use daily observations; ranges use calendar days.`;
  for (const id of ['#fx-start','#fx-end']) { $(id).min = earliest; $(id).max = latest; }
  if (!fxStart) { fxStart = earliest; $('#fx-start').value = earliest; }
  if (!fxEnd) { fxEnd = latest; $('#fx-end').value = latest; }
  container.innerHTML = `<div class="fx-pairs">${data.pairs.map(pair => {
    // Cropping never restarts a rule or moving average.
    const history = fxWindow(fxAnalyze(pair.history, fxSettings)), last = history.at(-1);
    if (!last) return `<article class="fx-panel fx-pair"><h2>${pair.code} / KRW</h2><p class="fx-muted">No observations in this range.</p></article>`;
    const amount = value => value === null ? '—' : `₩${fxNumber(value * pair.displayUnits)}`;
    const selectedChange = (last.close / history[0].close - 1) * 100;
    return `<article class="fx-panel fx-pair"><div class="fx-pair-heading"><div><h2>${pair.code} / KRW</h2><p class="fx-muted">${escapeHTML(pair.name)} · ${pair.displayUnits} ${pair.code}</p></div><div class="fx-quote"><strong>${amount(last.close)}</strong><span>${last.date}${fxRange === 'dates' ? ' · selected end' : ''}</span></div></div>
      <div class="fx-stats"><span>1D <strong>${fxPercent(last.change)}</strong></span>${fxRange === '1D' ? '' : `<span>Range <strong>${fxPercent(selectedChange)}</strong></span>`}<span>${history.length} observations</span></div>
      ${fxChart(history, pair.displayUnits)}
      <div class="fx-signals">${fxSettings.filter ? `<div><span>Filter rule</span><strong>${last.state}</strong><small>${last.since ? `Since ${last.since}` : 'Awaiting entry'}</small></div>` : ''}${fxSettings.bands ? `<div><span>Channel · ${fxSettings.channel}</span><strong>${last.breakout === 'Inside' ? 'Inside channel' : last.breakout === 'Warming up' ? 'Warming up' : `${last.breakout} breakout`}</strong><small>${amount(last.support)} – ${amount(last.resistance)}</small></div>` : ''}${fxSettings.averages ? `<div><span>SMA ${fxSettings.fast} / ${fxSettings.slow}</span><strong>${amount(last.fast)} / ${amount(last.slow)}</strong><small>Through ${last.date}</small></div>` : ''}</div>
      ${fxTable(history, pair)}</article>`;
  }).join('')}</div>`;
}

function validateFX(data) {
  const expected = ['USD','EUR','JPY','GBP','CNY','CHF','AUD','CAD'];
  if (data.schemaVersion !== 1 || data.quoteCurrency !== 'KRW' || !data.generatedAt || !data.snapshotAt
      || !Array.isArray(data.pairs) || data.pairs.length !== expected.length
      || data.pairs.some((pair,index) => pair.code !== expected[index] || pair.displayUnits !== (pair.code === 'JPY' ? 100 : 1)
        || !Array.isArray(pair.history) || pair.history.length < 21 || pair.asOf !== pair.history.at(-1).date
        || pair.history.some((point,i) => !fxDate(point.date) || point.date >= data.snapshotAt.slice(0,10)
          || !Number.isFinite(point.close) || point.close <= 0 || (i > 0 && point.date <= pair.history[i-1].date)))) throw new Error('Invalid FX payload');
}

async function loadFX() {
  try {
    const response = await fetch(`data/fx.json?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    validateFX(data);
    fxState = {data, loading:false};
  } catch (error) {
    console.error('FX:', error);
    fxState = {error:true, loading:false};
  }
  syncView();
}

function initFX() {
  $('#fx-range').addEventListener('change', event => {
    const range = event.target.value;
    $('#fx-custom-days').hidden = range !== 'custom';
    $('#fx-custom-dates').hidden = range !== 'dates';
    if (!['custom','dates'].includes(range)) { fxRange = range; $('#fx-error').textContent = ''; renderFX(); }
  });
  $('#fx-controls').addEventListener('submit', event => {
    event.preventDefault();
    const candidate = {...fxSettings};
    for (const key of ['fast','slow','channel','x','y','lookback','hold']) candidate[key] = Number($(`#fx-${key}`).value);
    for (const key of ['neutral','averages','bands','filter']) candidate[key] = $(`#fx-${key}`).checked;
    candidate.mode = $('#fx-mode').value;
    candidate.holdMode = $('#fx-hold-mode').value;
    const range = $('#fx-range').value, days = Number($('#fx-days').value);
    const start = $('#fx-start').value, end = $('#fx-end').value;
    let error = fxSettingsError(candidate);
    if (range === 'custom' && (!Number.isInteger(days) || days < 1 || days > 2225)) error = 'Choose 1–2225 calendar days.';
    if (range === 'dates' && (!fxDate(start) || !fxDate(end) || start > end || start < $('#fx-start').min || end > $('#fx-end').max)) error = 'Choose ordered dates within the available history.';
    $('#fx-error').textContent = error;
    if (error) return;
    fxSettings = candidate; fxRange = range; fxDays = days; fxStart = start; fxEnd = end;
    renderFX();
  });
  loadFX();
}
