// Explicit metadata keeps ETF units/maturities separate from crypto USD prices.
const cryptoSpecs = [
  ['bitcoin','BTC-USD','USD / BTC','$',2], ['ethereum','ETH-USD','USD / ETH','$',2]
];
const bondSpecs = [
  ['kr-3y','114260.KS','KRW / share','₩',0,'KR','3 years'],
  ['kr-10y','148070.KS','KRW / share','₩',0,'KR','10 years'],
  ['kr-30y','439870.KS','KRW / share','₩',0,'KR','30 years'],
  ['us-0-3m','SGOV','USD / share','$',2,'US','0–3 months'],
  ['us-1-3y','SHY','USD / share','$',2,'US','1–3 years'],
  ['us-3-7y','IEI','USD / share','$',2,'US','3–7 years'],
  ['us-7-10y','IEF','USD / share','$',2,'US','7–10 years'],
  ['us-10-20y','TLH','USD / share','$',2,'US','10–20 years'],
  ['us-20y','TLT','USD / share','$',2,'US','20+ years']
];

function validateAssetHistory(data, specs, assetClass, key) {
  const items = data[key];
  if (data.schemaVersion !== 1 || data.assetClass !== assetClass || data.priceBasis !== 'unadjusted-close'
      || !data.generatedAt || !data.snapshotAt || !Array.isArray(items) || items.length !== specs.length
      || items.some((item,index) => {
        const [code,ticker,unit,prefix,decimals,country,maturity] = specs[index];
        return item.code !== code || item.ticker !== ticker || item.unit !== unit || item.pricePrefix !== prefix
          || item.decimals !== decimals || item.country !== country || item.maturity !== maturity
          || typeof item.name !== 'string' || !Array.isArray(item.history) || item.history.length < 21
          || item.asOf !== item.history.at(-1).date || item.history.some((p,i) => !historyDate(p.date)
            || (country === 'KR' ? p.date > data.snapshotAt.slice(0,10) : p.date >= data.snapshotAt.slice(0,10))
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
  id:'bonds', label:'Government bonds', file:'data/bonds.json', loadingText:'Loading government-bond ETFs…', tableNoun:'ETF prices',
  items: data => data.bonds,
  validate: data => validateAssetHistory(data,bondSpecs,'government-bond-etfs','bonds'),
  groups: items => [{label:'Korea',items:items.filter(p => p.country === 'KR')},
                   {label:'United States',items:items.filter(p => p.country === 'US')}],
  describe: item => ({title:`${item.maturity} exposure`, subtitle:`${item.name} · ${item.ticker} · ${item.unit}`,
    note:item.code === 'kr-30y' ? 'History begins August 23, 2022.' : '',
    scale:1, prefix:item.pricePrefix, decimals:item.decimals, unitLabel:item.unit})
});
