// Provider quote units are explicit: US cents for grains, USD for metals/energy.
const commoditySpecs = [
  ['gold','GC=F','USD / troy oz','$',2], ['silver','SI=F','USD / troy oz','$',3],
  ['copper','HG=F','USD / lb','$',4], ['wti','CL=F','USD / barrel','$',2],
  ['brent','BZ=F','USD / barrel','$',2], ['gas','NG=F','USD / MMBtu','$',3],
  ['wheat','ZW=F','US cents / bushel','US¢',2], ['corn','ZC=F','US cents / bushel','US¢',2],
  ['soybeans','ZS=F','US cents / bushel','US¢',2]
];

function validateCommodities(data) {
  if (data.schemaVersion !== 1 || data.assetClass !== 'commodity-futures' || data.quoteCurrency !== 'USD'
      || !data.generatedAt || !data.snapshotAt || !Array.isArray(data.commodities)
      || data.commodities.length !== commoditySpecs.length
      || data.commodities.some((item, index) => {
        const [code,ticker,unit,prefix,decimals] = commoditySpecs[index];
        return item.code !== code || item.ticker !== ticker || item.unit !== unit
          || item.pricePrefix !== prefix || item.decimals !== decimals
          || typeof item.name !== 'string' || typeof item.category !== 'string'
          || !Array.isArray(item.history) || item.history.length < 21 || item.asOf !== item.history.at(-1).date
          || item.history.some((point,i) => !historyDate(point.date) || point.date >= data.snapshotAt.slice(0,10)
            || !Number.isFinite(point.close) || (i > 0 && point.date <= item.history[i-1].date));
      }) || data.asOf !== data.commodities.map(item => item.asOf).sort()[0]) throw new Error('Invalid commodities payload');
}

const commoditiesDashboard = new HistoryDashboard({
  id: 'commodities', label: 'Commodities', file: 'data/commodities.json', loadingText: 'Loading daily commodity futures…', tableNoun: 'prices',
  items: data => data.commodities,
  validate: validateCommodities,
  describe: item => ({title: item.name, subtitle: `${item.category} · ${item.ticker} · ${item.unit}`,
    scale: 1, prefix: item.pricePrefix, decimals: item.decimals, unitLabel: item.unit})
});
