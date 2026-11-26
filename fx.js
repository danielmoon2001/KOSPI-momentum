function validateFX(data) {
  if (data.morningQuote) validateMorningFX(data.morningQuote);
  const expected = ['USD','EUR','JPY','GBP','CNY','CHF','AUD','CAD'];
  if (data.schemaVersion !== 1 || data.quoteCurrency !== 'KRW' || !data.generatedAt || !data.snapshotAt
      || !Array.isArray(data.pairs) || data.pairs.length !== expected.length
      || data.pairs.some((pair,index) => pair.code !== expected[index] || pair.displayUnits !== (pair.code === 'JPY' ? 100 : 1)
        || !Array.isArray(pair.history) || pair.history.length < 21 || pair.asOf !== pair.history.at(-1).date
        || pair.history.some((point,i) => !historyDate(point.date) || point.date >= data.snapshotAt.slice(0,10)
          || !Number.isFinite(point.close) || point.close <= 0 || (i > 0 && point.date <= pair.history[i-1].date)))) throw new Error('Invalid FX payload');
}

function validateMorningFX(q) {
  const cutoff = Date.parse(q.snapshotAt), observed = Date.parse(q.observedAt);
  if (!Number.isFinite(cutoff) || !q.snapshotAt.endsWith('T07:00:00+09:00')
      || q.ticker !== 'KRW=X' || q.interval !== '5m' || q.baseCurrency !== 'USD' || q.quoteCurrency !== 'KRW'
      || !['current','stale','unavailable'].includes(q.status)) throw new Error('Invalid morning FX metadata');
  if (q.status === 'unavailable') {
    if (q.value !== null || q.observedAt !== null || q.fetchedAt !== null) throw new Error('Unavailable morning quote');
  } else if (!Number.isFinite(q.value) || q.value <= 0 || !Number.isFinite(observed) || observed > cutoff
      || !Number.isFinite(Date.parse(q.fetchedAt)) || (q.status === 'current' && cutoff-observed > 3600000)) {
    throw new Error('Invalid morning FX quote');
  }
}

function morningFXText(q) {
  if (q.status === 'unavailable') return '7 AM USD/KRW reference · Unavailable';
  return `7 AM reference · ${q.observedAt.slice(0,10)} ${q.observedAt.slice(11,16)} KST${q.status === 'stale' ? ' · Delayed' : ''}`;
}

const fxDashboard = new HistoryDashboard({
  id: 'fx', label: 'FX', file: 'data/fx.json', loadingText: 'Loading daily FX rates…', tableNoun: 'rates',
  items: data => data.pairs,
  validate: validateFX,
  note: pair => pair.code === 'USD' && fxDashboard.state.data?.morningQuote
    ? `${morningFXText(fxDashboard.state.data.morningQuote)}${fxDashboard.state.data.morningQuote.value == null ? '' : ` · ₩${historyNumber(fxDashboard.state.data.morningQuote.value,2)}`} · Daily chart below.` : '',
  describe: pair => ({title: `${pair.code} / KRW`, subtitle: `${pair.name} · ${pair.displayUnits} ${pair.code}`,
    scale: pair.displayUnits, prefix: '₩', decimals: 2, unitLabel: `KRW per ${pair.displayUnits} ${pair.code}`})
});
