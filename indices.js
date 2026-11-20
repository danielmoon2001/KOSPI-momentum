// Price indices: no individual securities, ETFs, screening or tracking state.
const indexSpecs = [
  ['kospi','^KS11','Index points','',2,'KR'],
  ['kosdaq','^KQ11','Index points','',2,'KR'],
  ['sp500','^GSPC','Index points','',2,'US'],
  ['nasdaq100','^NDX','Index points','',2,'US'],
  ['nasdaq','^IXIC','Index points','',2,'US'],
  ['dow','^DJI','Index points','',2,'US'],
  ['nikkei','^N225','Index points','',2,'JP'],
  ['hangseng','^HSI','Index points','',2,'HK'],
  ['hscei','^HSCE','Index points','',2,'HK']
];

const indicesDashboard = new HistoryDashboard({
  id:'indices', label:'Equity indices', file:'data/indices.json',
  loadingText:'Loading equity indices…', tableNoun:'index levels',
  items: data => data.indices,
  validate: data => validateAssetHistory(data,indexSpecs,'equity-indices','indices','price-index'),
  groups: items => [['KR','Korea'],['US','United States'],['JP','Japan'],['HK','Hong Kong']]
    .map(([country,label]) => ({label,items:items.filter(item => item.country === country)})),
  describe: item => ({title:item.name, subtitle:`${item.ticker} · Price index`,
    scale:1, prefix:'', decimals:2, unitLabel:'Index points'})
});
