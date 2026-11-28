// Context metrics are levels/ratios, not tradable prices or long/short signals.
const metricSpecs = [
  ['vix','Index points',1], ['move','Index points',1], ['putcall','Put/call ratio',1],
  ['hy_oas','Percent',2], ['feargreed','Score (0–100)',1]
];

const metricGuides = {
  vix: {title:'VIX', text:'S&P 500 option-implied volatility for the next 30 days, quoted at an annualized rate. A reading of 20 means roughly 20% annualized volatility. Higher means larger expected swings, not a direction forecast.'},
  move: {title:'MOVE', text:'Option-implied US bond-yield volatility. Higher values mean more interest-rate uncertainty; compare with its own history. It does not tell you whether yields will rise or fall.'},
  putcall: {title:'Cboe total put/call', text:'Total daily put volume divided by call volume. Above 1 means more puts than calls; below 1 means more calls. Rising readings can reflect defensive hedging, not a standalone buy or sell signal.'},
  hy_oas: {title:'High-yield spread', text:'Extra yield on below-investment-grade US corporate bonds over Treasuries, adjusted for embedded options. 400 bps means 4 percentage points. Widening signals higher credit-risk premiums; narrowing signals easing.'},
  feargreed: {title:'Fear & Greed', text:'Seven US market indicators combined into a 0–100 sentiment score: 0 is extreme fear, 50 is near neutral, and 100 is extreme greed. Extremes describe sentiment, not reliable reversal timing.'}
};

function validateMetrics(data) {
  if (data.schemaVersion !== 1 || data.assetClass !== 'metrics' || !data.generatedAt
      || !Number.isFinite(Date.parse(data.snapshotAt)) || !Array.isArray(data.metrics)
      || data.metrics.length !== metricSpecs.length) throw new Error('Invalid metrics payload');
  for (const [index,[code,unit,lag]] of metricSpecs.entries()) {
    const item = data.metrics[index];
    const end = new Date(Date.parse(data.snapshotAt.slice(0,10)) - lag * 86400000).toISOString().slice(0,10);
    if (item.code !== code || item.unit !== unit || item.lagDays !== lag || !item.name || !item.source
        || !Array.isArray(item.history) || !['current','stale','unavailable'].includes(item.status)) throw new Error('Invalid metric');
    if (item.status === 'unavailable') {
      if (item.history.length || item.asOf !== null || item.fetchedAt !== null) throw new Error('Unavailable value');
      continue;
    }
    if (item.history.length < 2 || item.asOf !== item.history.at(-1).date
        || !Number.isFinite(Date.parse(item.fetchedAt))) throw new Error('Invalid coverage');
    if (item.status === 'current' && Date.parse(data.snapshotAt.slice(0,10)) - Date.parse(item.asOf) > 7 * 86400000) throw new Error('Old data marked current');
    let previous = '';
    for (const p of item.history) {
      if (!historyDate(p.date) || p.date <= previous || p.date > end || typeof p.close !== 'number'
          || !Number.isFinite(p.close) || p.close < 0 || (code === 'feargreed' && p.close > 100)
          || (['vix','move'].includes(code) && p.close === 0)) throw new Error('Invalid observation');
      previous = p.date;
    }
  }
  const dates = data.metrics.map(p => p.asOf).filter(Boolean).sort();
  if (data.asOf !== (dates[0] || null)) throw new Error('Invalid metrics date');
}

const metricsDashboard = new HistoryDashboard({
  id:'metrics', label:'Metrics', file:'data/metrics.json', loadingText:'Loading market metrics…',
  tableNoun:'observations', technical:false, absoluteChanges:true,
  items:data => data.metrics, validate:validateMetrics,
  guide:item => metricGuides[item.code].text,
  describe:item => ({title:(window.innerWidth || 1024) <= 760 ? metricGuides[item.code].title : item.name,
    subtitle:item.code === 'putcall' ? 'Total daily options volume · Puts / calls'
      : item.code === 'hy_oas' ? 'Option-adjusted spread · Basis points'
      : item.code === 'feargreed' ? 'Sentiment · 0 fear / 100 greed' : 'Implied volatility · Index points',
    scale:item.code === 'hy_oas' ? 100 : 1, prefix:'',
    suffix:item.code === 'hy_oas' ? ' bps' : '',
    deltaSuffix:item.code === 'hy_oas' ? ' bps' : item.code === 'putcall' ? '' : ' pts',
    decimals:item.code === 'hy_oas' ? 0 : item.code === 'feargreed' ? 1 : 2,
    unitLabel:item.code === 'hy_oas' ? 'Basis points (100 bps = 1 percentage point)' : item.unit,
    valueLabel:item.code === 'hy_oas' ? 'OAS (bps)' : item.code === 'putcall' ? 'Ratio' : 'Level'}),
  note:item => `${item.source}${item.status === 'stale' ? ' · Retained / delayed data — refresh unavailable or observation overdue.' : item.status === 'unavailable' ? ' · Unavailable' : ''}`
});
