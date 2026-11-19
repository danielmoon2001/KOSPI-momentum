function validateFX(data) {
  const expected = ['USD','EUR','JPY','GBP','CNY','CHF','AUD','CAD'];
  if (data.schemaVersion !== 1 || data.quoteCurrency !== 'KRW' || !data.generatedAt || !data.snapshotAt
      || !Array.isArray(data.pairs) || data.pairs.length !== expected.length
      || data.pairs.some((pair,index) => pair.code !== expected[index] || pair.displayUnits !== (pair.code === 'JPY' ? 100 : 1)
        || !Array.isArray(pair.history) || pair.history.length < 21 || pair.asOf !== pair.history.at(-1).date
        || pair.history.some((point,i) => !historyDate(point.date) || point.date >= data.snapshotAt.slice(0,10)
          || !Number.isFinite(point.close) || point.close <= 0 || (i > 0 && point.date <= pair.history[i-1].date)))) throw new Error('Invalid FX payload');
}

const fxDashboard = new HistoryDashboard({
  id: 'fx', label: 'FX', file: 'data/fx.json', loadingText: 'Loading daily FX rates…', tableNoun: 'rates',
  items: data => data.pairs,
  validate: validateFX,
  describe: pair => ({title: `${pair.code} / KRW`, subtitle: `${pair.name} · ${pair.displayUnits} ${pair.code}`,
    scale: pair.displayUnits, prefix: '₩', decimals: 2, unitLabel: `KRW per ${pair.displayUnits} ${pair.code}`})
});
