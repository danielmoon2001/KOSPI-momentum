// Compact, read-only summaries of the same payloads used by each subpage.
// Never use a chart's selected range/settings to decide the latest summary value.
function homeRow(label, value, change = '—', detail = '', href = '') {
  const name = href ? `<a href="${href}">${escapeHTML(label)}</a>` : escapeHTML(label);
  return `<li class="home-quote"><span class="home-quote-label">${name}<small>${escapeHTML(detail)}</small></span>
    <strong>${escapeHTML(value)}</strong><span class="home-change">${escapeHTML(change)}</span></li>`;
}

function homeHistoryRows(dashboard, selections) {
  const {data,loading} = dashboard.state;
  if (!data) return `<li class="home-empty">${loading ? 'Loading…' : 'Unavailable'}</li>`;
  const items = dashboard.config.items(data);
  return selections.map(([code,label,unit]) => {
    const item = items.find(p => p.code === code);
    if (dashboard.config.id === 'fx' && code === 'USD' && data.morningQuote) {
      const quote = data.morningQuote;
      return homeRow(label,quote.value == null ? '—' : `₩${historyNumber(quote.value,2)}`,'',morningFXText(quote));
    }
    if (!item || item.status === 'unavailable' || !item.history.length) return homeRow(label,'—','', 'Unavailable');
    const view = dashboard.config.describe(item), last = item.history.at(-1), previous = item.history.at(-2);
    const value = `${view.prefix}${historyNumber(last.close * view.scale,view.decimals)}${view.suffix || ''}`;
    let change = '—';
    if (previous && dashboard.config.absoluteChanges) {
      const delta = (last.close - previous.close) * view.scale;
      change = `${delta >= 0 ? '+' : ''}${historyNumber(delta,view.decimals)}${view.deltaSuffix || ''}`;
    } else if (previous && previous.close > 0 && last.close > 0) {
      change = historyPercent((last.close / previous.close - 1) * 100);
    }
    const detail = `${unit} · ${last.date}${item.status === 'stale' ? ' · Delayed' : ''}`;
    return homeRow(label,value,change,detail);
  }).join('');
}

function renderHomeSummary() {
  const equitySnapshots = Object.values(state).map(entry => entry.data?.snapshotAt).filter(Boolean);
  $('#home-equities-status').textContent = equitySnapshots.length === 4 && equitySnapshots.every(stamp => stamp === equitySnapshots[0])
    ? `Snapshot ${formatSnapshot(equitySnapshots[0])}`
    : 'US: 7 AM KST · Asia: 9 PM KST · Dates shown per market';
  $('#home-equities-summary').innerHTML = Object.entries(markets).map(([key,market]) => {
    const entry = state[key];
    return homeRow(market.name,entry.data ? String(entry.data.stocks.length) : '—','',
      entry.data ? `Matches · ${entry.data.asOf}` : entry.loading ? 'Loading…' : 'Unavailable',market.route);
  }).join('');
  const tracked = trackingState.data ? visibleEpisodes(trackingState.data) : null;
  $('#home-tracking-summary').innerHTML = tracked
    ? homeRow('Tracking',String(tracked.filter(p => p.status === 'active').length),'Active','All four markets','#tracking')
      + homeRow('First down day',String(tracked.filter(p => p.status === 'ended').length),'Ended','Current market sessions','#tracking')
    : homeRow('Tracking','—','',trackingState.loading ? 'Loading…' : 'Unavailable','#tracking');
  const sections = [
    [indicesDashboard,[['kospi','KOSPI','Points'],['sp500','S&P 500','Points'],['nikkei','Nikkei 225','Points'],['hangseng','Hang Seng','Points']]],
    [fxDashboard,[['USD','USD / KRW','₩ per USD'],['EUR','EUR / KRW','₩ per EUR'],['JPY','JPY / KRW','₩ per 100 JPY']]],
    [commoditiesDashboard,[['gold','Gold','USD / troy oz'],['wti','WTI','USD / barrel'],['copper','Copper','USD / lb']]],
    [cryptoDashboard,[['bitcoin','Bitcoin','USD'],['ethereum','Ethereum','USD']]],
    [bondsDashboard,[['kr-3y','Korea 3Y','TR index'],['kr-10y','Korea 10Y','TR index'],['us-1-3y','US 1–3Y','TR index'],['us-3-10y','US 3–10Y','TR index']]],
    [metricsDashboard,[['vix','VIX','Points'],['move','MOVE','Points'],['putcall','Put/call','Total volume ratio'],['hy_oas','HY OAS','Basis points'],['feargreed','Fear & Greed','Score / 100']]]
  ];
  for (const [dashboard,selections] of sections) {
    $(`#home-${dashboard.config.id}-summary`).innerHTML = homeHistoryRows(dashboard,selections);
  }
  $('#home-rates-summary').innerHTML = ['bok','kr-3y','kr-10y','ffr','us-2y','us-10y']
    .map(bondRateRow).join('');
}
