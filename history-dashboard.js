// Shared chart UI; each history section owns separate state, controls and data.
const historyRanges = {'1D':1,'1W':7,'2W':14,'1M':30,'3M':90,'6M':180,'1Y':365,'2Y':730,'3Y':1095,'5Y':1825,'10Y':3652,'20Y':7305};
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
    this.range = '1M';
    this.days = 30;
    this.start = '';
    this.end = '';
    this.settings = {...fxDefaults, averages:false, bands:false, filter:false};
    this.selections = new Map();
    this.rendered = new Map();
  }

  node(suffix) { return $(`#${this.config.id}-${suffix}`); }

  window(history, range = this.range, selection = this) {
    if (!history.length) return [];
    if (range === 'MAX') return history;
    if (range === 'dates') return history.filter(p => p.date >= selection.start && p.date <= selection.end);
    if (range === '1D') return history.slice(-2);
    const boundary = Date.parse(history.at(-1).date) - (range === 'custom' ? selection.days : historyRanges[range]) * 86400000;
    return history.filter(p => Date.parse(p.date) >= boundary);
  }

  // Full-resolution paths, sampled hover targets; tables expose every exact value.
  chart(history, view) {
    const {scale: units, prefix, decimals, unitLabel} = view;
    const number = value => historyNumber(value, decimals);
    const series = [{label:view.valueLabel || 'Close',key:'close',color:'#245db1'}];
    if (this.settings.averages) series.push({label:`SMA ${this.settings.fast}`,key:'fast',color:'#ad5135'}, {label:`SMA ${this.settings.slow}`,key:'slow',color:'#6a4da2'});
    if (this.settings.bands) series.push({label:'Support',key:'support',color:'#24765c',dash:true}, {label:'Resistance',key:'resistance',color:'#a53e70',dash:true});
    const values = series.flatMap(line => history.filter(p => p[line.key] !== null).map(p => p[line.key] * units));
    let low = Math.min(...values), high = Math.max(...values);
    const pad = (high - low || Math.abs(high) * 0.01 || 1) * 0.12;
    low -= pad; high += pad;
    const first = Date.parse(history[0].date), last = Date.parse(history.at(-1).date);
    // Phones need a landscape plot, not the desktop height squeezed into a narrow SVG.
    const mobile = (window.innerWidth || 1024) <= 760;
    const width = mobile ? Math.max(240, Math.min(600, window.innerWidth - 72)) : 480;
    const height = mobile ? Math.round(width * 0.62) : 255;
    const left = mobile ? 42 : 70, right = width - (mobile ? 8 : 30);
    const top = mobile ? 10 : 20, bottom = height - (mobile ? 24 : 35);
    const x = date => left + (Date.parse(date) - first) / (last - first || 1) * (right - left);
    const y = value => top + (high - value * units) / (high - low) * (bottom - top);
    const ticks = [0,1,2,3,4].map(i => {
      const value = low + (high - low) * i / 4, position = y(value / units);
      return `<line x1="${left}" y1="${position}" x2="${right}" y2="${position}" class="fx-gridline"/><text x="${left - 6}" y="${position + 4}" text-anchor="end">${mobile ? new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(value) : number(value)}</text>`;
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
    return `<div class="fx-chart-scroll"><svg class="fx-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily ${view.valueLabel ? 'observations' : 'closes'} (${escapeHTML(unitLabel)}). Exact values in the daily table.">${ticks}${lines}${hover}${markers}<circle cx="${x(endpoint.date)}" cy="${y(endpoint.close)}" r="2.5" fill="#245db1"/><text x="${left}" y="${height - 6}">${mobile ? history[0].date.slice(5) : history[0].date}</text><text x="${right}" y="${height - 6}" text-anchor="end">${mobile ? endpoint.date.slice(5) : endpoint.date}</text></svg></div>
      <div class="fx-chart-key">${series.map(line => `<span><i style="background:${line.color}"></i>${line.label}</span>`).join('')}${this.settings.filter ? '<span>▲ Long · ▼ Short · ◆ Exit</span>' : ''}${this.settings.bands ? '<span>○ Channel breakout</span>' : ''}</div>`;
  }

  table(history, view) {
    const amount = value => value == null ? '—' : historyNumber(value * view.scale, view.decimals);
    const columns = [{label:view.valueLabel || (view.prefix ? `Close (${view.prefix})` : 'Index level'), key:'close',format:amount}];
    if (!this.config.absoluteChanges) columns.push({label:'Change',key:'change',format:historyPercent});
    if (this.settings.averages) columns.push({label:`SMA ${this.settings.fast}`,key:'fast',format:amount},{label:`SMA ${this.settings.slow}`,key:'slow',format:amount});
    if (this.settings.bands) columns.push({label:'Support',key:'support',format:amount},{label:'Resistance',key:'resistance',format:amount},{label:'Channel',key:'breakout',format:escapeHTML});
    if (this.settings.filter) columns.push({label:'FR state',key:'state',format:escapeHTML},{label:'FR signal',key:'signal',format:v=>escapeHTML(v || '—')},{label:'FR upper',key:'upper',format:amount},{label:'FR lower',key:'lower',format:amount});
    return `<details><summary>Daily ${this.config.tableNoun}</summary><div class="table-container"><table class="fx-table"><caption>${escapeHTML(view.unitLabel)} · newest first</caption>
      <thead><tr><th>Date</th>${columns.map(c=>`<th>${escapeHTML(c.label)}</th>`).join('')}</tr></thead>
      <tbody>${[...history].reverse().map(p=>`<tr><th scope="row">${p.date}</th>${columns.map(c=>`<td>${c.format(p[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  }

  selection(item) {
    return this.selections.get(item.code) || {range:this.range, days:this.days,
      start:this.start || item.history[0].date, end:this.end || item.asOf};
  }

  rangeControls(item) {
    const value = this.selection(item), id = `${this.config.id}-${item.code}`;
    return `<div class="chart-range" data-code="${item.code}">
      <label for="${id}-range">Range</label><select id="${id}-range" data-field="range">${[...Object.keys(historyRanges),'MAX','custom','dates'].map(r => `<option value="${r}" ${r === value.range ? 'selected' : ''}>${r === 'custom' ? 'Custom days' : r === 'dates' ? 'Exact dates' : r}</option>`).join('')}</select>
      <span data-custom ${value.range !== 'custom' ? 'hidden' : ''}><label for="${id}-days">Days</label><input id="${id}-days" data-field="days" type="number" min="1" max="50000" step="1" value="${value.days}"></span>
      <span data-dates ${value.range !== 'dates' ? 'hidden' : ''}><label for="${id}-start">From</label><input id="${id}-start" data-field="start" type="date" min="${item.history[0].date}" max="${item.asOf}" value="${value.start}"><label for="${id}-end">To</label><input id="${id}-end" data-field="end" type="date" min="${item.history[0].date}" max="${item.asOf}" value="${value.end}"></span>
      <small class="chart-error" role="alert"></small></div>`;
  }

  cardBody(item) {
    const view = this.config.describe(item), selection = this.selection(item);
    const analyzed = this.settings.averages || this.settings.bands || this.settings.filter ? fxAnalyze(item.history,this.settings)
      : item.history.map((p,i) => ({...p,change:i && p.close > 0 && item.history[i-1].close > 0 ? (p.close/item.history[i-1].close-1)*100 : null}));
    const history = this.window(analyzed, selection.range, selection), last = history.at(-1);
    this.rendered.set(item.code, {history,view});
    if (!last) return '<p class="fx-muted">No observations in this range.</p>';
    const amount = value => value === null ? '—' : `${view.prefix}${historyNumber(value * view.scale, view.decimals)}${view.suffix || ''}`;
    const selectedChange = history.every(p => p.close > 0) ? (last.close / history[0].close - 1) * 100 : null;
    const fullIndex = analyzed.findIndex(p => p.date === last.date);
    const delta = value => value == null ? '—' : `${value >= 0 ? '+' : ''}${historyNumber(value * view.scale,view.decimals)}${view.deltaSuffix || ''}`;
    const dailyChange = this.config.absoluteChanges ? delta(fullIndex > 0 ? last.close - analyzed[fullIndex - 1].close : null) : historyPercent(last.change);
    const rangeChange = this.config.absoluteChanges ? delta(last.close - history[0].close) : historyPercent(selectedChange);
    return `<div class="history-latest"><strong>${amount(last.close)}</strong><span>${last.date}${selection.range === 'dates' ? ' · selected end' : ''}</span></div>
      <div class="fx-stats"><span>1D <strong>${dailyChange}</strong></span>${selection.range === '1D' ? '' : `<span>Range <strong>${rangeChange}</strong></span>`}<span>${history.length} observations</span></div>
      ${this.chart(history,view)}
      <div class="fx-signals">${this.settings.filter ? `<div><span>Filter rule</span><strong>${last.state}</strong><small>${last.since ? `Since ${last.since}` : 'Awaiting entry'}</small></div>` : ''}${this.settings.bands ? `<div><span>Channel · ${this.settings.channel}</span><strong>${last.breakout === 'Inside' ? 'Inside channel' : last.breakout === 'Warming up' ? 'Warming up' : `${last.breakout} breakout`}</strong><small>${amount(last.support)} – ${amount(last.resistance)}</small></div>` : ''}${this.settings.averages ? `<div><span>SMA ${this.settings.fast} / ${this.settings.slow}</span><strong>${amount(last.fast)} / ${amount(last.slow)}</strong></div>` : ''}</div>
      <details class="fx-details" data-history="${item.code}"><summary>Daily ${this.config.tableNoun}${this.config.technical === false ? '' : ' &amp; signals'} · ${history.length} observations</summary><div class="history-table"></div></details>`;
  }

  render() {
    const container = this.node('content');
    if (this.state.loading || this.state.error) {
      container.innerHTML = `<p class="empty-state">${this.state.loading ? this.config.loadingText : `${this.config.label} data is unavailable. Please try again later.`}</p>`;
      $('#asof').textContent = this.state.loading ? 'Loading…' : `${this.config.label} unavailable`;
      return;
    }
    const data = this.state.data, items = this.config.items(data);
    $('#asof').textContent = `Updated ${formatUpdated(data.generatedAt,true)}`;
    this.node('updated').textContent = `${formatSnapshot(data.snapshotAt)} · ${data.source || 'Yahoo Finance'}`;
    const available = items.filter(p => p.history.length);
    const earliest = available.map(p => p.history[0].date).sort()[0], latest = available.map(p => p.asOf).sort().at(-1);
    this.node('coverage').textContent = available.length ? `${earliest} — ${latest}` : 'Sources currently unavailable.';
    const groups = this.config.groups ? this.config.groups(items) : [{label:null,items}];
    container.innerHTML = groups.map(group => `${group.label ? `<h2 class="history-group-title">${escapeHTML(group.label)}</h2>` : ''}<div class="fx-pairs">${group.items.map(item => {
      const view = this.config.describe(item);
      return `<article class="fx-panel fx-pair" id="${this.config.id}-card-${item.code}"><div class="fx-pair-heading"><div><h2>${escapeHTML(view.title)}</h2><p class="fx-muted">${escapeHTML(view.subtitle)}</p></div></div>
        ${this.config.note ? `<p class="fx-muted metric-note">${escapeHTML(this.config.note(item))}</p>` : ''}
        ${item.history.length ? `${this.rangeControls(item)}<div class="history-body">${this.cardBody(item)}</div>` : '<p class="empty-state">Source unavailable. No value substituted.</p>'}</article>`;
    }).join('')}</div>`).join('');
  }

  async load() {
    try {
      const response = await fetch(`${this.config.file}?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.config.validate(data);
      this.state = {data,loading:false};
    } catch (error) {
      console.error(`${this.config.label}:`,error);
      this.state = {error:true,loading:false};
    }
    syncView();
  }

  init() {
    const form = this.node('controls');
    form.addEventListener('submit',event => event.preventDefault());
    const updateSettings = () => {
      const candidate = {...this.settings};
      for (const key of ['fast','slow','channel','x','y','lookback','hold']) candidate[key] = Number(this.node(key).value);
      for (const key of ['neutral','averages','bands','filter']) candidate[key] = this.node(key).checked;
      candidate.mode = this.node('mode').value;
      candidate.holdMode = this.node('hold-mode').value;
      const error = fxSettingsError(candidate);
      this.node('error').textContent = error;
      if (error) return;
      this.settings = candidate;
      this.render();
    };
    if (this.config.technical !== false) {
      form.addEventListener('change',updateSettings);
      form.addEventListener('input',updateSettings);
    }
    const content = this.node('content');
    const updateRange = event => {
      const controls = event.target.closest('.chart-range');
      if (!controls || !event.target.dataset.field || !this.state.data) return;
      const item = this.config.items(this.state.data).find(p => p.code === controls.dataset.code);
      const field = key => controls.querySelector(`[data-field="${key}"]`).value;
      const selected = {range:field('range'),days:Number(field('days')),start:field('start'),end:field('end')};
      controls.querySelector('[data-custom]').hidden = selected.range !== 'custom';
      controls.querySelector('[data-dates]').hidden = selected.range !== 'dates';
      const error = selected.range === 'custom' && (!Number.isInteger(selected.days) || selected.days < 1 || selected.days > 50000) ? 'Choose 1–50000 days.'
        : selected.range === 'dates' && (!historyDate(selected.start) || !historyDate(selected.end) || selected.start > selected.end || selected.start < item.history[0].date || selected.end > item.asOf) ? 'Choose dates within this history.' : '';
      controls.querySelector('.chart-error').textContent = error;
      if (error) return;
      this.selections.set(item.code,selected);
      controls.closest('article').querySelector('.history-body').innerHTML = this.cardBody(item);
    };
    content.addEventListener('change',updateRange);
    content.addEventListener('input',updateRange);
    // Long histories stay inexpensive until their exact daily table is requested.
    content.addEventListener('toggle',event => {
      const code = event.target.dataset.history;
      if (!code || !event.target.open) return;
      const destination = event.target.querySelector('.history-table');
      if (destination.innerHTML) return;
      const {history,view} = this.rendered.get(code);
      const html = this.table(history,view);
      destination.innerHTML = html.slice(html.indexOf('<div class="table-container">'),html.lastIndexOf('</details>'));
    },true);
    this.load();
  }
}
