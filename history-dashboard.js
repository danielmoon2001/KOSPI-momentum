// Shared chart UI. FX and commodities own separate state, controls and data.
const historyRanges = {'1D':1,'1W':7,'2W':14,'1M':30,'3M':90,'6M':180,'1Y':365,'2Y':730,'3Y':1095,'5Y':1825};
const historyPercent = value => value == null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const historyFormatters = new Map();
const historyNumber = (value, decimals = 2) => {
  if (!historyFormatters.has(decimals)) historyFormatters.set(decimals,
    new Intl.NumberFormat('en-US', {minimumFractionDigits:decimals,maximumFractionDigits:decimals}));
  return historyFormatters.get(decimals).format(value);
};
const historyDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;

class HistoryDashboard {
  constructor(config) {
    this.config = config;
    this.state = {loading: true};
    this.range = '3M';
    this.days = 90;
    this.start = '';
    this.end = '';
    this.settings = {...fxDefaults};
  }

  node(suffix) { return $(`#${this.config.id}-${suffix}`); }

  window(history, range = this.range) {
    if (!history.length) return [];
    if (range === 'dates') return history.filter(p => p.date >= this.start && p.date <= this.end);
    if (range === '1D') return history.slice(-2);
    const boundary = Date.parse(history.at(-1).date) - (range === 'custom' ? this.days : historyRanges[range]) * 86400000;
    return history.filter(p => Date.parse(p.date) >= boundary);
  }

  // Full-resolution paths, sampled hover targets; tables expose every exact value.
  chart(history, view) {
    const {scale: units, prefix, decimals, unitLabel} = view;
    const number = value => historyNumber(value, decimals);
    const series = [{label:'Close',key:'close',color:'#245db1'}];
    if (this.settings.averages) series.push({label:`SMA ${this.settings.fast}`,key:'fast',color:'#ad5135'}, {label:`SMA ${this.settings.slow}`,key:'slow',color:'#6a4da2'});
    if (this.settings.bands) series.push({label:'Support',key:'support',color:'#24765c',dash:true}, {label:'Resistance',key:'resistance',color:'#a53e70',dash:true});
    const values = series.flatMap(line => history.filter(p => p[line.key] !== null).map(p => p[line.key] * units));
    let low = Math.min(...values), high = Math.max(...values);
    const pad = (high - low || Math.abs(high) * 0.01 || 1) * 0.12;
    low -= pad; high += pad;
    const first = Date.parse(history[0].date), last = Date.parse(history.at(-1).date);
    const x = date => 70 + (Date.parse(date) - first) / (last - first || 1) * 380;
    const y = value => 20 + (high - value * units) / (high - low) * 200;
    const ticks = [0,1,2,3,4].map(i => {
      const value = low + (high - low) * i / 4, position = y(value / units);
      return `<line x1="70" y1="${position}" x2="450" y2="${position}" class="fx-gridline"/><text x="60" y="${position + 4}" text-anchor="end">${number(value)}</text>`;
    }).join('');
    const lines = series.map(line => `<polyline fill="none" stroke="${line.color}" stroke-width="${line.key === 'close' ? 2 : 1.4}" ${line.dash ? 'stroke-dasharray="4 3"' : ''} points="${history.filter(p => p[line.key] !== null).map(p => `${x(p.date)},${y(p[line.key])}`).join(' ')}"/>`).join('');
    const step = Math.max(1, Math.ceil(history.length / 150));
    const hover = history.filter((p,i) => i % step === 0 || i === history.length - 1).map(p => `<circle cx="${x(p.date)}" cy="${y(p.close)}" r="5" class="fx-point"><title>${p.date} · ${escapeHTML(prefix)}${number(p.close * units)}</title></circle>`).join('');
    const markers = history.map(p => {
      const px = x(p.date), py = y(p.close);
      let result = '';
      if (this.settings.bands && ['Up','Down'].includes(p.breakout)) result += `<circle cx="${px}" cy="${py}" r="4" fill="white" stroke="#646a73"><title>${p.date} · ${p.breakout} channel breakout</title></circle>`;
      if (this.settings.filter && p.signal) {
        const up = p.signal === 'Long', down = p.signal === 'Short';
        result += `<path d="${up ? `M${px},${py - 6}l-5,10h10z` : down ? `M${px},${py + 6}l-5,-10h10z` : `M${px},${py - 5}l-5,5l5,5l5,-5z`}" fill="${up ? '#24765c' : down ? '#a53e70' : '#6b7077'}"><title>${p.date} · Filter: ${p.signal}</title></path>`;
      }
      return result;
    }).join('');
    const endpoint = history.at(-1);
    return `<div class="fx-chart-scroll"><svg class="fx-chart" viewBox="0 0 480 255" role="img" aria-label="Daily closes (${escapeHTML(unitLabel)}) and selected technical indicators. Exact values and signals in the daily table.">${ticks}${lines}${hover}${markers}<circle cx="${x(endpoint.date)}" cy="${y(endpoint.close)}" r="2.5" fill="#245db1"/><text x="70" y="247">${history[0].date}</text><text x="450" y="247" text-anchor="end">${endpoint.date}</text></svg></div>
      <div class="fx-chart-key">${series.map(line => `<span><i style="background:${line.color}"></i>${line.label}</span>`).join('')}${this.settings.filter ? '<span>▲ Long · ▼ Short · ◆ Exit</span>' : ''}${this.settings.bands ? '<span>○ Channel breakout</span>' : ''}</div>`;
  }

  table(history, view) {
    const amount = value => value === null ? '—' : historyNumber(value * view.scale, view.decimals);
    return `<details class="fx-details"><summary>Daily ${this.config.tableNoun} &amp; signals · ${history.length} observations</summary><div class="table-container"><table class="fx-table"><caption>${escapeHTML(view.unitLabel)} · selected range · newest first</caption>
      <thead><tr><th>Date</th><th>Close (${escapeHTML(view.prefix)})</th><th>Change</th><th>SMA ${this.settings.fast}</th><th>SMA ${this.settings.slow}</th><th>Support</th><th>Resistance</th><th>Channel</th><th>FR state</th><th>FR signal</th><th>FR upper</th><th>FR lower</th></tr></thead>
      <tbody>${[...history].reverse().map(p => `<tr><th scope="row">${p.date}</th><td>${amount(p.close)}</td><td>${historyPercent(p.change)}</td><td>${amount(p.fast)}</td><td>${amount(p.slow)}</td><td>${amount(p.support)}</td><td>${amount(p.resistance)}</td><td>${p.breakout}</td><td>${p.state}</td><td>${p.signal || '—'}</td><td>${amount(p.upper)}</td><td>${amount(p.lower)}</td></tr>`).join('')}</tbody></table></div></details>`;
  }

  render() {
    const container = this.node('content');
    if (this.state.loading || this.state.error) {
      container.innerHTML = `<p class="empty-state">${this.state.loading ? this.config.loadingText : `${this.config.label} data is unavailable. Please try again later.`}</p>`;
      $('#asof').textContent = this.state.loading ? 'Loading…' : `${this.config.label} unavailable`;
      return;
    }
    const data = this.state.data;
    const items = this.config.items(data);
    $('#asof').textContent = `Updated ${formatUpdated(data.generatedAt, true)}`;
    this.node('updated').textContent = `Snapshot: ${formatSnapshot(data.snapshotAt)} · Source: Yahoo Finance.`;
    const earliest = items.map(p => p.history[0].date).sort().at(-1), latest = items.map(p => p.asOf).sort().at(-1);
    this.node('coverage').textContent = `Available history: ${earliest} — ${latest}. Periods use daily observations; ranges use calendar days.`;
    for (const id of ['start','end']) { this.node(id).min = earliest; this.node(id).max = latest; }
    if (!this.start) { this.start = earliest; this.node('start').value = earliest; }
    if (!this.end) { this.end = latest; this.node('end').value = latest; }
    container.innerHTML = `<div class="fx-pairs">${items.map(pair => {
      const view = this.config.describe(pair);
      // Cropping never restarts a rule or moving average.
      const history = this.window(fxAnalyze(pair.history, this.settings)), last = history.at(-1);
      if (!last) return `<article class="fx-panel fx-pair"><h2>${escapeHTML(view.title)}</h2><p class="fx-muted">No observations in this range.</p></article>`;
      const amount = value => value === null ? '—' : `${view.prefix}${historyNumber(value * view.scale, view.decimals)}`;
      const selectedChange = history.every(p => p.close > 0) ? (last.close / history[0].close - 1) * 100 : null;
      return `<article class="fx-panel fx-pair"><div class="fx-pair-heading"><div><h2>${escapeHTML(view.title)}</h2><p class="fx-muted">${escapeHTML(view.subtitle)}</p></div><div class="fx-quote"><strong>${amount(last.close)}</strong><span>${last.date}${this.range === 'dates' ? ' · selected end' : ''}</span></div></div>
        <div class="fx-stats"><span>1D <strong>${historyPercent(last.change)}</strong></span>${this.range === '1D' ? '' : `<span>Range <strong>${historyPercent(selectedChange)}</strong></span>`}<span>${history.length} observations</span></div>
        ${this.chart(history, view)}
        <div class="fx-signals">${this.settings.filter ? `<div><span>Filter rule</span><strong>${last.state}</strong><small>${last.since ? `Since ${last.since}` : 'Awaiting entry'}</small></div>` : ''}${this.settings.bands ? `<div><span>Channel · ${this.settings.channel}</span><strong>${last.breakout === 'Inside' ? 'Inside channel' : last.breakout === 'Warming up' ? 'Warming up' : `${last.breakout} breakout`}</strong><small>${amount(last.support)} – ${amount(last.resistance)}</small></div>` : ''}${this.settings.averages ? `<div><span>SMA ${this.settings.fast} / ${this.settings.slow}</span><strong>${amount(last.fast)} / ${amount(last.slow)}</strong><small>Through ${last.date}</small></div>` : ''}</div>
        ${this.table(history, view)}</article>`;
    }).join('')}</div>`;
  }

  async load() {
    try {
      const response = await fetch(`${this.config.file}?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.config.validate(data);
      this.state = {data, loading:false};
    } catch (error) {
      console.error(`${this.config.label}:`, error);
      this.state = {error:true, loading:false};
    }
    syncView();
  }

  init() {
    this.node('range').addEventListener('change', event => {
      const range = event.target.value;
      this.node('custom-days').hidden = range !== 'custom';
      this.node('custom-dates').hidden = range !== 'dates';
      if (!['custom','dates'].includes(range)) { this.range = range; this.node('error').textContent = ''; this.render(); }
    });
    this.node('controls').addEventListener('submit', event => {
      event.preventDefault();
      const candidate = {...this.settings};
      for (const key of ['fast','slow','channel','x','y','lookback','hold']) candidate[key] = Number(this.node(key).value);
      for (const key of ['neutral','averages','bands','filter']) candidate[key] = this.node(key).checked;
      candidate.mode = this.node('mode').value;
      candidate.holdMode = this.node('hold-mode').value;
      const range = this.node('range').value, days = Number(this.node('days').value);
      const start = this.node('start').value, end = this.node('end').value;
      let error = fxSettingsError(candidate);
      if (range === 'custom' && (!Number.isInteger(days) || days < 1 || days > 2225)) error = 'Choose 1–2225 calendar days.';
      if (range === 'dates' && (!historyDate(start) || !historyDate(end) || start > end || start < this.node('start').min || end > this.node('end').max)) error = 'Choose ordered dates within the available history.';
      this.node('error').textContent = error;
      if (error) return;
      this.settings = candidate; this.range = range; this.days = days; this.start = start; this.end = end;
      this.render();
    });
    this.load();
  }
}
