// Actual government-bond index levels and crypto USD prices have distinct units.
const cryptoSpecs = [
  ['bitcoin','BTC-USD','USD / BTC','$',2], ['ethereum','ETH-USD','USD / ETH','$',2]
];
const bondSpecs = [
  ['kr-3y','KAPKTB3Y','Index points','',2,'KR','3 years'],
  ['kr-5y','KAPKTB5Y','Index points','',2,'KR','5 years'],
  ['kr-10y','KAPKTB10Y','Index points','',2,'KR','10 years'],
  ['kr-30y','KAPKTB30Y','Index points','',2,'KR','30 years'],
  ['us-0-1y','DE000SLA9S87','Index points','',2,'US','0–1 year'],
  ['us-1-3y','DE000SLA4B65','Index points','',2,'US','1–3 years'],
  ['us-3-10y','DE000SLA4B73','Index points','',2,'US','3–10 years'],
  ['us-10-20y','DE000SLA4B81','Index points','',2,'US','10–20 years'],
  ['us-20y','DE000SLA4B99','Index points','',2,'US','20+ years']
];

function validateAssetHistory(data, specs, assetClass, key, priceBasis = assetClass === 'crypto' ? 'unadjusted-close' : 'total-return-index') {
  const items = data[key];
  if (data.schemaVersion !== 1 || data.assetClass !== assetClass || data.priceBasis !== priceBasis
      || !data.generatedAt || !data.snapshotAt || !Array.isArray(items) || items.length !== specs.length
      || items.some((item,index) => {
        const [code,ticker,unit,prefix,decimals,country,maturity] = specs[index];
        return item.code !== code || item.ticker !== ticker || item.unit !== unit || item.pricePrefix !== prefix
          || item.decimals !== decimals || item.country !== country || item.maturity !== maturity
          || typeof item.name !== 'string' || !Array.isArray(item.history) || item.history.length < 21
          || item.asOf !== item.history.at(-1).date || item.history.some((p,i) => !historyDate(p.date)
            || (['KR','JP','HK'].includes(country) ? p.date > data.snapshotAt.slice(0,10) : p.date >= data.snapshotAt.slice(0,10))
            || !Number.isFinite(p.close) || p.close <= 0 || (i && p.date <= item.history[i-1].date));
      }) || data.asOf !== items.map(p => p.asOf).sort()[0]) throw new Error(`Invalid ${assetClass} data`);
}

const cryptoDashboard = new HistoryDashboard({
  id:'crypto', label:'Crypto', file:'data/crypto.json', loadingText:'Loading Bitcoin and Ethereum…', tableNoun:'prices',
  items: data => data.assets,
  validate: data => validateAssetHistory(data,cryptoSpecs,'crypto','assets'),
  describe: item => ({title:item.name, subtitle:`${item.ticker} · ${item.unit} · UTC daily close`,
    scale:1, prefix:item.pricePrefix, decimals:item.decimals, unitLabel:item.unit})
});

const bondsDashboard = new HistoryDashboard({
  id:'bonds', label:'Government bonds', file:'data/bonds.json', loadingText:'Loading bond indices…', tableNoun:'index levels',
  items: data => data.bonds,
  validate: data => validateAssetHistory(data,bondSpecs,'government-bond-indices','bonds'),
  groups: items => [{label:'Korea',items:items.filter(p => p.country === 'KR')},
                   {label:'United States',items:items.filter(p => p.country === 'US')}],
  describe: item => ({title:item.maturity, subtitle:`${item.source} · Total return · ${item.currency}`,
    scale:1, prefix:item.pricePrefix, decimals:item.decimals, unitLabel:item.unit})
});
