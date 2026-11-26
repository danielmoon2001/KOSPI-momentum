const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = ['fx-analysis.js', 'history-dashboard.js', 'fx.js', 'commodities.js', 'bond-rates.js', 'crypto-bonds.js', 'indices.js', 'metrics.js', 'home.js', 'script.js'].map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')).join('\n');
const settle = () => new Promise(resolve => setImmediate(resolve));

function metricsPayload() {
  const specs=[['vix','VIX','Index points',1],['move','MOVE','Index points',1],
    ['putcall','Cboe put/call ratio','Put/call ratio',1],['hy_oas','ICE BofA US High Yield OAS','Percent',2],
    ['feargreed','CNN Fear & Greed','Score (0–100)',1]];
  const metrics=specs.map(([code,name,unit,lagDays])=>{
    const end=Date.parse('2026-11-21')-lagDays*86400000;
    const history=Array.from({length:41},(_,i)=>({date:new Date(end-(40-i)*86400000).toISOString().slice(0,10),close:code==='hy_oas' ? 3.12+i/100 : 20+i/10}));
    return {code,name,unit,lagDays,source:'Provider',status:'current',fetchedAt:'2026-11-21T21:05:00+09:00',asOf:history.at(-1).date,history};
  });
  return {schemaVersion:1,assetClass:'metrics',snapshotAt:'2026-11-21T21:00:00+09:00',generatedAt:'2026-11-21T21:05:00+09:00',asOf:'2026-11-19',metrics};
}

function morningQuote(status='current') {
  return {ticker:'KRW=X',baseCurrency:'USD',quoteCurrency:'KRW',interval:'5m',source:'Yahoo Finance',
    snapshotAt:'2026-11-26T07:00:00+09:00',observedAt:'2026-11-26T07:00:00+09:00',
    fetchedAt:'2026-11-26T10:00:00+09:00',value:1343.98,status};
}

test('morning Home uses a timestamped USD reference without changing daily FX history',async()=>{
  const p=page('#home'),fx=fxPayload();fx.morningQuote=morningQuote();
  const daily=JSON.stringify(fx.pairs[0].history);
  respond(p,'data/fx.json',fx);
  const us=payload('USA');us.snapshotAt='2026-11-26T07:00:00+09:00';
  respond(p,'data/results-us.json',us);respond(p,'data/results.json',payload('KR','KRW'));
  await settle();
  assert.match(p.node('#home-fx-summary').innerHTML,/₩1,343\.98/);
  assert.match(p.node('#home-fx-summary').innerHTML,/7 AM reference · 2026-11-26 07:00 KST/);
  assert.match(p.node('#home-equities-status').textContent,/US: 7 AM KST/);
  p.go('#fx');assert.match(p.node('#fx-content').innerHTML,/Daily chart below/);
  assert.equal(p.evaluate('JSON.stringify(fxDashboard.state.data.pairs[0].history)'),daily);
  p.go('#USmatches');assert.match(p.node('#matches-updated').textContent,/7 AM KST/);
});

test('morning reference rejects future prices and labels retained quotes',async()=>{
  const p=page('#home'),fx=fxPayload();fx.morningQuote=morningQuote('stale');
  fx.morningQuote.observedAt='2026-11-25T06:00:00+09:00';
  respond(p,'data/fx.json',fx);await settle();
  assert.match(p.node('#home-fx-summary').innerHTML,/Delayed/);
  const bad=morningQuote();bad.observedAt='2026-11-26T07:05:00+09:00';
  assert.throws(()=>p.evaluate(`validateMorningFX(${JSON.stringify(bad)})`),/Invalid morning FX quote/);
});

test('home summarizes every section with latest numbers, correct units and visible tracking counts',async()=>{
  const p=page('#home'), indices=indicesPayload(), crypto=assetPayload('crypto');
  indices.indices[0].history.at(-2).close=100;
  indices.indices[0].history.at(-1).close=125;
  crypto.assets[0].history.at(-2).close=100;
  crypto.assets[0].history.at(-1).close=110;
  for(const [file,data] of [
    ['results.json',payload('KR','KRW')],['results-us.json',{...payload('US'),stocks:[]}],
    ['results-japan.json',payload('JP','JPY')],['results-hk.json',payload('HK','HKD')],
    ['tracking.json',trackingPayload()],['indices.json',indices],['fx.json',fxPayload()],
    ['commodities.json',commoditiesPayload()],['crypto.json',crypto],
    ['bonds.json',assetPayload('bonds')],['metrics.json',metricsPayload()]]) respond(p,`data/${file}`,data);
  await settle();
  assert.match(p.node('#home-equities-summary').innerHTML,/href="#KOSPImatches"/);
  assert.match(p.node('#home-equities-summary').innerHTML,/<strong>0<\/strong>/);
  assert.equal((p.node('#home-tracking-summary').innerHTML.match(/<strong>1<\/strong>/g)||[]).length,2);
  assert.match(p.node('#home-indices-summary').innerHTML,/125\.00/);
  assert.match(p.node('#home-indices-summary').innerHTML,/\+25\.00%/);
  assert.match(p.node('#home-fx-summary').innerHTML,/₩4,000\.00/);
  assert.match(p.node('#home-fx-summary').innerHTML,/₩ per 100 JPY/);
  assert.match(p.node('#home-crypto-summary').innerHTML,/\$110\.00/);
  assert.match(p.node('#home-crypto-summary').innerHTML,/\+10\.00%/);
  assert.match(p.node('#home-bonds-summary').innerHTML,/TR index/);
  assert.match(p.node('#home-metrics-summary').innerHTML,/352 bps/);
  assert.match(p.node('#home-metrics-summary').innerHTML,/\+1 bps/);
  for(const section of ['equities','indices','fx','commodities','crypto','bonds','metrics']) {
    assert.match(p.node(`#home-${section}-summary`).innerHTML,/<strong>/);
    assert.doesNotMatch(p.node(`#home-${section}-summary`).innerHTML,/<svg|NaN|undefined/);
  }
  const original=p.node('#home-fx-summary').innerHTML;
  p.evaluate('fxDashboard.selections.set("USD",{range:"dates",start:"2026-10-20",end:"2026-10-21"});renderHomeSummary()');
  assert.equal(p.node('#home-fx-summary').innerHTML,original);
});

test('home retains source dates and delayed labels while unavailable sources never become zero',async()=>{
  const p=page('#home'),data=metricsPayload();
  data.metrics[0].status='stale';
  data.metrics[1]={...data.metrics[1],status:'unavailable',asOf:null,fetchedAt:null,history:[]};
  data.metrics[4].history.at(-1).close=0;
  respond(p,'data/metrics.json',data);
  p.pending['data/fx.json'].reject(new Error('offline'));
  await settle();
  assert.match(p.node('#home-metrics-summary').innerHTML,/2026-11-20 · Delayed/);
  assert.match(p.node('#home-metrics-summary').innerHTML,/MOVE<small>Unavailable<\/small><\/span>\s*<strong>—<\/strong>/);
  assert.match(p.node('#home-metrics-summary').innerHTML,/<strong>0\.0<\/strong>/);
  assert.match(p.node('#home-fx-summary').innerHTML,/Unavailable/);
  p.go('#USmatches');respond(p,'data/results-us.json',payload('USA'));await settle();
  assert.equal(p.node('#view-home').style.display,'none');
  assert.match(p.node('#rows').innerHTML,/USA/);
});

test('phone charts use a landscape aspect and reclaim plot width; desktop geometry is preserved',async()=>{
  const p=page('#metrics');respond(p,'data/metrics.json',metricsPayload());await settle();
  for(const viewport of [320,360,390,600,760]) {
    p.evaluate(`window.innerWidth=${viewport};metricsDashboard.render()`);
    const html=p.node('#metrics-content').innerHTML;
    const [,w,h]=html.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
    assert.ok(h/w<=0.63);
    const [,left,right]=html.match(/<line x1="([\d.]+)" y1="[\d.]+" x2="([\d.]+)"/).map(Number);
    assert.ok((right-left)/w>0.75);
    assert.ok(right<w);
  }
  p.evaluate('window.innerWidth=1200;metricsDashboard.render()');
  assert.match(p.node('#metrics-content').innerHTML,/viewBox="0 0 480 255"/);
});

test('metrics renders five independent reference series, basis points and explicit degraded states', async()=>{
  const p=page('#metrics'),data=metricsPayload();
  data.metrics[0].status='stale';
  data.metrics[4]={...data.metrics[4],status:'unavailable',history:[],asOf:null,fetchedAt:null};
  respond(p,'data/metrics.json',data);await settle();
  const html=p.node('#metrics-content').innerHTML;
  assert.equal(p.node('#view-metrics').style.display,'block');
  assert.equal(p.node('#view-matches').style.display,'none');
  assert.equal(p.node('#nav-metrics')['aria-current'],'page');
  assert.equal((html.match(/<article /g)||[]).length,5);
  assert.match(html,/352 bps/);assert.match(html,/Retained \/ delayed data/);
  assert.match(html,/Source unavailable/);assert.match(html,/Total daily options volume/);
  assert.match(html,/<option value="1M" selected>/);
  assert.doesNotMatch(html,/SMA 20|Filter rule|&amp; signals/);
  p.go('#home');assert.match(p.node('#home-metrics-status').textContent,/3\/5 refreshed/);
});

test('invalid metrics and late responses cannot disable or replace an equity route', async()=>{
  for(const kind of ['future','oas-lag','score','units','missing','status']) {
    const p=page('#metrics'),data=metricsPayload();
    if(kind==='future')data.metrics[0].history.at(-1).date='2026-11-21';
    if(kind==='oas-lag')data.metrics[3].history.at(-1).date='2026-11-20';
    if(kind==='score')data.metrics[4].history.at(-1).close=101;
    if(kind==='units')data.metrics[3].unit='Basis points';
    if(kind==='missing')data.metrics.pop();
    if(kind==='status')data.metrics[0].status='fresh';
    respond(p,'data/metrics.json',data);await settle();
    assert.match(p.node('#metrics-content').innerHTML,/data is unavailable/);
    p.go('#USmatches');respond(p,'data/results-us.json',payload('USA'));await settle();
    assert.match(p.node('#rows').innerHTML,/USA/);
  }
});

test('mobile chart coordinates narrow with the viewport and retain both endpoints',async()=>{
  const p=page('#metrics');p.evaluate('window.innerWidth=320');
  respond(p,'data/metrics.json',metricsPayload());await settle();
  const html=p.node('#metrics-content').innerHTML;
  assert.match(html,/viewBox="0 0 248 154"/);
  assert.match(html,/<text x="240" y="148" text-anchor="end">11-20<\/text>/);
  assert.match(html,/<circle cx="240"/);
  assert.equal(p.evaluate('metricsDashboard.range'),'1M');
});

function indicesPayload() {
  const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/indices.json'),'utf8'));
  for (const item of data.indices) item.history=item.history.slice(-60);
  return data;
}

test('index page groups nine actual indices, starts at 1M, and stays separate from screening', async () => {
  const p=page('#indices');respond(p,'data/indices.json',indicesPayload());await settle();
  assert.equal(p.node('#view-indices').style.display,'block');
  assert.equal(p.node('#view-matches').style.display,'none');
  assert.equal(p.node('#equity-navigation').style.display,'none');
  const html=p.node('#indices-content').innerHTML;
  assert.equal((html.match(/<article /g)||[]).length,9);
  for (const name of ['Korea','United States','Japan','Hong Kong','KOSPI','Nasdaq-100','Nikkei 225','Hang Seng']) assert.ok(html.includes(name));
  assert.match(html,/<option value="1M" selected>/);
  assert.doesNotMatch(html,/SMA 20|<span>Filter rule<\/span>|ETF|Volume Ratio/);
  for (const name of ['fx','commodities','crypto','bonds','indices']) assert.equal(p.evaluate(`${name}Dashboard.range`),'1M');
  p.evaluate('indicesDashboard.selections.set("kospi",{range:"MAX",days:30});indicesDashboard.render()');
  assert.equal(p.evaluate('indicesDashboard.rendered.get("kospi").history.length'),60);
  assert.ok(p.evaluate('indicesDashboard.rendered.get("kosdaq").history.length')<32);
  p.go('#home');assert.match(p.node('#home-indices-status').textContent,/9 indices · Four markets/);
});

test('index validation rejects mismatched series, unfinished sessions and missing indices', async () => {
  for (const kind of ['series','us-date','asia-date','missing','basis']) {
    const p=page('#indices'),data=indicesPayload();
    if(kind==='series') data.indices[0].ticker='SPY';
    if(kind==='us-date') data.indices[2].history.at(-1).date=data.snapshotAt.slice(0,10);
    if(kind==='asia-date') data.indices[6].history.at(-1).date='2099-01-01';
    if(kind==='missing') data.indices.pop();
    if(kind==='basis') data.priceBasis='total-return-index';
    respond(p,'data/indices.json',data);respond(p,'data/results.json',payload('KOREA','KRW'));await settle();
    assert.match(p.node('#indices-content').innerHTML,/data is unavailable/);
    p.go('#KOSPImatches');assert.match(p.node('#rows').innerHTML,/KOREA/);
  }
});

function page(hash = '#overview') {
  const nodes = new Map();
  const node = key => {
    if (!nodes.has(key)) nodes.set(key, {style: {}, textContent: '', innerHTML: '', handlers: {}, addEventListener(name,callback) {this.handlers[name]=callback;}, setAttribute(name, value) { this[name] = value; }, replaceChildren() { this.innerHTML = ''; }});
    return nodes.get(key);
  };
  const pending = {};
  const events = {};
  const window = { location: {hash}, scrollTo() {}, addEventListener(name, callback) { events[name] = callback; } };
  const context = vm.createContext({window, document: {querySelector: node, querySelectorAll: () => [node('window-days')]},
    console: {error() {}}, Date, Intl, Promise,
    fetch: url => new Promise((resolve, reject) => { pending[url.split('?')[0]] = {resolve, reject}; })});
  vm.runInContext(source, context);
  return {node, pending, evaluate(code) {return vm.runInContext(code, context);}, go(hash) {window.location.hash = hash; events.hashchange();}};
}

function payload(ticker, currency = 'USD') {
  return {asOf: '2026-10-30', snapshotAt: '2026-11-01T21:00:00+09:00', generatedAt: '2026-11-02T07:10:00+09:00', currency,
    volumeMultiplier: 1.5, priceMultiplier: 1.1, windowDays: 5, baseCalendarDays: 5, evalTradingDays: 3,
    dates: ['2026-10-28', '2026-10-29', '2026-10-30'],
    stocks: [{ticker, name: 'Example & Co', marketCap: 123456789,
      volumeRatio: 2, priceRatio: 1.2, closes: [100.25, 110.5, 120.75]}]};
}
function respond(page, file, data) {page.pending[file].resolve({ok: true, json: async () => data});}

test('direct US route stays US when KOSPI finishes first; currencies switch independently', async () => {
  const p = page('#USmatches');
  assert.match(p.node('#rows').innerHTML, /Loading US/);
  respond(p, 'data/results.json', payload('KOREA', 'KRW'));
  await settle();
  assert.match(p.node('#rows').innerHTML, /Loading US/);
  respond(p, 'data/results-us.json', payload('USA'));
  await settle();
  assert.equal(p.node('#matches-title').textContent, 'US Matches.');
  assert.equal(p.node('#match-eval-metric').textContent, '3 Days');
  assert.equal(p.node('#match-eval-label').textContent, 'Evaluation · trading days');
  assert.equal(p.node('#match-base-metric').textContent, '5 Days');
  assert.match(p.node('#asof').textContent, /^Updated /);
  assert.match(p.node('#matches-updated').textContent, /Prices & caps:/);
  assert.match(p.node('#snapshot-status').textContent, /9 PM KST/);
  assert.match(p.node('#prices-body').innerHTML, />100\.25</);
  assert.doesNotMatch(p.node('#prices-body').innerHTML, /[$₩]/);
  assert.match(p.node('#prices-head').innerHTML, /\$/);
  assert.match(p.node('#rows').innerHTML, /\$/);
  assert.match(p.node('#rows').innerHTML, /\$0\.1bn/);
  assert.doesNotMatch(p.node('#normalized-body').innerHTML, /\$/);
  assert.match(p.node('#rows').innerHTML, /Example &amp; Co/);
  p.go('#KOSPImatches');
  assert.match(p.node('#rows').innerHTML, /KOREA/);
  assert.doesNotMatch(p.node('#prices-body').innerHTML, /[$₩]/);
  assert.match(p.node('#prices-head').innerHTML, /₩/);
  assert.match(p.node('#rows').innerHTML, /₩/);
  assert.match(p.node('#rows').innerHTML, /₩1\.2억/);
  assert.equal(p.node('#nav-kospi')['aria-current'], 'page');
  assert.doesNotMatch(p.node('#rows').innerHTML, /USA/);
  p.go('#overview');
  assert.equal(p.node('#view-matches').style.display, 'none');
  assert.equal(p.node('#count-us').textContent, '1 match');
});

test('one failed market never disables the other market', async () => {
  const p = page('#USmatches');
  p.pending['data/results-us.json'].reject(new Error('offline'));
  respond(p, 'data/results.json', payload('KOREA', 'KRW'));
  await settle();
  assert.match(p.node('#rows').innerHTML, /Couldn&#39;t load US/);
  p.go('#matches'); // Backward-compatible old KOSPI link.
  assert.match(p.node('#rows').innerHTML, /KOREA/);
  assert.equal(p.node('#prices-section').style.display, 'flex');
});

test('empty market clears history instead of leaving the other market visible', async () => {
  const p = page('#KOSPImatches');
  respond(p, 'data/results.json', payload('KOREA', 'KRW'));
  respond(p, 'data/results-us.json', {...payload('USA'), stocks: []});
  await settle();
  p.go('#USmatches');
  assert.match(p.node('#rows').innerHTML, /No US stocks matched/);
  assert.equal(p.node('#prices-section').style.display, 'none');
  assert.equal(p.node('#prices-body').innerHTML, '');
  assert.equal(p.node('#normalized-body').innerHTML, '');
});

test('historical snapshots keep their original calendar-window labels', async () => {
  const p = page('#USmatches');
  const old = payload('USA');
  delete old.baseCalendarDays;
  delete old.evalTradingDays;
  respond(p, 'data/results-us.json', old);
  await settle();
  assert.equal(p.node('#match-eval-metric').textContent, '5 Days');
  assert.equal(p.node('#match-eval-label').textContent, 'Evaluation · calendar days');
  assert.match(p.node('#matches-updated').textContent, /Earlier snapshot/);
});

function trackingPayload() {
  const episode = {id: 'kospi:ABC:2026-11-09', market: 'kospi', ticker: 'ABC', name: 'Example & Co',
    foundDate: '2026-11-09', status: 'active', survivedSessions: 2,
    history: [{date: '2026-11-09', close: 100}, {date: '2026-11-10', close: 100}, {date: '2026-11-11', close: 110}]};
  return {schemaVersion: 1, startedAt: '2026-11-09T21:00:00+09:00',
    snapshotAt: '2026-11-12T21:00:00+09:00', generatedAt: '2026-11-12T21:01:00+09:00',
    markets: {kospi: {asOf: '2026-11-12'}, us: {asOf: '2026-11-11'}},
    episodes: [episode,
      {...episode, id: 'us:DROP:2026-11-09', ticker: 'DROP', market: 'us', status: 'ended',
        survivedSessions: 1, endedDate: '2026-11-11', completedAsOf: '2026-11-11',
        history: [{date: '2026-11-09', close: 100}, {date: '2026-11-10', close: 110}, {date: '2026-11-11', close: 105}]},
      {...episode, id: 'kospi:OLD:2026-11-09', ticker: 'OLD', status: 'ended',
        endedDate: '2026-11-10', completedAsOf: '2026-11-10'}]};
}

test('tracking route shows active and final-day episodes with complete history and independent market dates', async () => {
  const p = page('#tracking');
  assert.equal(p.node('#view-tracking').style.display, 'block');
  assert.equal(p.node('#view-overview').style.display, 'none');
  assert.equal(p.node('#nav-tracking')['aria-current'], 'page');
  respond(p, 'data/tracking.json', trackingPayload());
  await settle();
  const html = p.node('#tracking-cards').innerHTML;
  assert.match(html, /Tracking · 2 sessions/);
  assert.match(html, /Fell after 1 session/);
  assert.match(html, /Example &amp; Co/);
  assert.match(html, /First drop/);
  assert.match(html, />105\.00</);
  assert.match(html, /Close \(₩\)/);
  assert.match(html, /Close \(\$\)/);
  assert.doesNotMatch(html, /OLD/);
  assert.equal(p.node('#count-tracking').textContent, '2 stocks followed');
  respond(p, 'data/results.json', payload('KOREA', 'KRW'));
  await settle();
  assert.equal(p.node('#view-tracking').style.display, 'block');
  assert.equal(p.node('#tracking-cards').innerHTML, html);
  p.go('#KOSPImatches');
  assert.equal(p.node('#view-tracking').style.display, 'none');
  assert.match(p.node('#rows').innerHTML, /KOREA/);
});

test('tracking failure leaves screener routes available and empty tracking is explicit', async () => {
  const p = page('#tracking');
  p.pending['data/tracking.json'].reject(new Error('offline'));
  respond(p, 'data/results.json', payload('KOREA', 'KRW'));
  await settle();
  assert.match(p.node('#tracking-cards').innerHTML, /Couldn't load tracking/);
  p.go('#KOSPImatches');
  assert.match(p.node('#rows').innerHTML, /KOREA/);
  const empty = page('#tracking');
  respond(empty, 'data/tracking.json', {...trackingPayload(), episodes: []});
  await settle();
  assert.match(empty.node('#tracking-cards').innerHTML, /No stocks are being tracked/);
});

function fxPayload() {
  return {schemaVersion: 1, quoteCurrency: 'KRW', asOf: '2026-11-17',
    generatedAt: '2026-11-18T21:01:00+09:00', snapshotAt: '2026-11-18T21:00:00+09:00',
    pairs: ['USD','EUR','JPY','GBP','CNY','CHF','AUD','CAD'].map((code, i) => ({
      code, name: code, displayUnits: code === 'JPY' ? 100 : 1, asOf: '2026-11-17',
      history: Array.from({length: 30}, (_, j) => ({
        date: new Date(Date.UTC(2026, 9, 19 + j)).toISOString().slice(0,10), close: (code === 'JPY' ? 9 : 1000) + j + i
      }))
    }))};
}

test('dashboard is the default, legacy equity links work, FX responses do not switch the route', async () => {
  const p = page('');
  assert.equal(p.node('#view-home').style.display, 'block');
  assert.equal(p.node('#equity-navigation').style.display, 'none');
  p.go('#fx');
  assert.match(p.node('#fx-content').innerHTML, /Loading daily FX/);
  respond(p, 'data/results.json', payload('KOREA', 'KRW'));
  await settle();
  assert.equal(p.node('#view-fx').style.display, 'block');
  respond(p, 'data/fx.json', fxPayload());
  await settle();
  assert.doesNotMatch(p.node('#fx-content').innerHTML, /Relative movement/);
  assert.match(p.node('#fx-content').innerHTML, /JPY \/ KRW/);
  assert.match(p.node('#fx-content').innerHTML, /₩4,000.00/);
  assert.doesNotMatch(p.node('#fx-content').innerHTML, /<span>Filter rule<\/span>/);
  p.go('#matches');
  assert.match(p.node('#rows').innerHTML, /KOREA/);
  assert.equal(p.node('#equity-navigation').style.display, 'flex');
  p.go('#equities');
  assert.equal(p.node('#view-overview').style.display, 'block');
});

test('FX windows support exact dates and custom days without restarting indicators', async () => {
  const p = page('#fx');
  respond(p, 'data/fx.json', fxPayload());
  await settle();
  assert.equal(p.evaluate('fxDashboard.window(fxDashboard.state.data.pairs[0].history, "1D").length'), 2);
  assert.equal(p.evaluate('fxDashboard.window(fxDashboard.state.data.pairs[0].history, "1W").length'), 8);
  p.evaluate('fxDashboard.range="1D"; fxDashboard.render()');
  assert.match(p.node('#fx-content').innerHTML, /Daily rates &amp; signals · 2 observations/);
  p.evaluate('fxDashboard.range="custom"; fxDashboard.days=12; fxDashboard.render()');
  assert.match(p.node('#fx-content').innerHTML, /13 observations/);
  p.evaluate('fxDashboard.range="dates"; fxDashboard.start="2026-11-09"; fxDashboard.end="2026-11-10"; fxDashboard.render()');
  assert.match(p.node('#fx-content').innerHTML, /2026-11-10 · selected end/);
  assert.doesNotMatch(p.evaluate('fxDashboard.cardBody(fxDashboard.state.data.pairs[0])'), /2026-11-17/);
  assert.equal(p.evaluate('fxDashboard.window(fxAnalyze(fxDashboard.state.data.pairs[0].history))[0].fast'), 1011.5);
  p.evaluate('fxDashboard.start="2020-01-01"; fxDashboard.end="2020-01-02"; fxDashboard.render()');
  assert.match(p.node('#fx-content').innerHTML, /No observations/);
  assert.doesNotMatch(p.node('#fx-content').innerHTML, /NaN|Infinity/);
});

test('invalid FX data fails independently of equities', async () => {
  for (const invalid of ['future', 'negative', 'missing', 'units']) {
    const p = page('#fx');
    const data = fxPayload();
    if (invalid === 'future') data.pairs[0].history.at(-1).date = '2026-11-18';
    if (invalid === 'negative') data.pairs[0].history[0].close = -1;
    if (invalid === 'missing') data.pairs.pop();
    if (invalid === 'units') data.pairs[2].displayUnits = 1;
    respond(p, 'data/fx.json', data);
    respond(p, 'data/results.json', payload('KOREA', 'KRW'));
    await settle();
    assert.match(p.node('#fx-content').innerHTML, /FX data is unavailable/);
    p.go('#KOSPImatches');
    assert.match(p.node('#rows').innerHTML, /KOREA/);
  }
});

function analyze(prices, settings = {}) {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../fx-analysis.js'), 'utf8'), context);
  return JSON.parse(vm.runInContext(`JSON.stringify(fxAnalyze(${JSON.stringify(prices.map((close,i) => ({date: String(i),close})))}, {...fxDefaults,...${JSON.stringify(settings)}}))`, context));
}

test('SMA includes current close; channels exclude it and equality is not a breakout', () => {
  const rows = analyze([10,12,13,13,9], {fast:2,slow:3,channel:2});
  assert.equal(rows[0].fast, null);
  assert.equal(rows[1].fast, 11);
  assert.equal(rows[2].slow, 35/3);
  assert.equal(rows[2].support, 10);
  assert.equal(rows[2].resistance, 12);
  assert.equal(rows[2].breakout, 'Up');
  assert.equal(rows[3].breakout, 'Inside');
  assert.equal(rows[4].breakout, 'Down');
});

test('percentage filter ignores noise and reverses at running extrema thresholds', () => {
  const rows = analyze([100,105,110,120,119,109,108,118.8], {x:10});
  assert.deepEqual(rows.map(r => r.signal), ['', '', 'Long', '', '', '', 'Short', 'Long']);
  assert.equal(rows[5].state, 'Long');
  assert.equal(rows[6].lower, 108);
  assert.equal(rows[7].since, '7');
});

test('neutral y exit closes without a same-observation reversal', () => {
  const rows = analyze([100,110,120,114,100,110], {x:10,y:5,neutral:true});
  assert.deepEqual(rows.map(r => r.signal), ['', 'Long', '', 'Exit long', 'Short', 'Exit short']);
  assert.equal(rows[3].state, 'Neutral');
});

test('minimum holding period suppresses intervening signals but tracks extrema', () => {
  const rows = analyze([100,110,80,70,60], {x:10,hold:3});
  assert.deepEqual(rows.map(r => r.signal), ['', 'Long', '', '', 'Short']);
});

test('rolling references use exactly d prior observations and wait on ambiguous entries', () => {
  const rows = analyze([100,120,110], {x:10,mode:'rolling',lookback:2});
  assert.equal(rows[1].state, 'Warming up');
  assert.equal(rows[2].signal, 'Long');
  assert.equal(analyze([100,200,150], {x:10,mode:'rolling',lookback:2})[2].state, 'Neutral');
});

test('future observations cannot change any past indicator or filter signal', () => {
  for (const settings of [{}, {mode:'rolling',lookback:2}, {neutral:true}, {hold:3}, {hold:3,holdMode:'fixed'}]) {
    const prefix = [100,102,99,105,104,106,110,107];
    assert.deepEqual(analyze([...prefix,20,999],settings).slice(0,prefix.length), analyze(prefix,settings));
  }
});

test('invalid technical parameters fail and flat rates produce no filter entries', () => {
  for (const settings of [{x:0},{x:Infinity},{neutral:true,y:1},{hold:-1},{fast:1},{slow:2.5},{mode:'bad'}]) {
    assert.throws(() => analyze([100,100], settings));
  }
  assert.ok(analyze(Array(60).fill(100)).every(r => !r.signal));
});

test('fixed holding period exits at h regardless of subsequent price direction', () => {
  const rows = analyze([100,110,120,130,140,155], {x:10,hold:3,holdMode:'fixed'});
  assert.deepEqual(rows.map(r => r.signal), ['', 'Long', '', '', 'Exit long', 'Long']);
  assert.throws(() => analyze([100,110], {holdMode:'fixed',hold:0}));
});

function commoditiesPayload() {
  const specs = [
    ['gold','Gold','GC=F','USD / troy oz','$',2], ['silver','Silver','SI=F','USD / troy oz','$',3],
    ['copper','Copper','HG=F','USD / lb','$',4], ['wti','WTI crude oil','CL=F','USD / barrel','$',2],
    ['brent','Brent crude oil','BZ=F','USD / barrel','$',2], ['gas','Natural gas','NG=F','USD / MMBtu','$',3],
    ['wheat','Wheat','ZW=F','US cents / bushel','US¢',2], ['corn','Corn','ZC=F','US cents / bushel','US¢',2],
    ['soybeans','Soybeans','ZS=F','US cents / bushel','US¢',2]
  ];
  const data = fxPayload();
  return {schemaVersion:1,assetClass:'commodity-futures',quoteCurrency:'USD',generatedAt:data.generatedAt,
    snapshotAt:data.snapshotAt,asOf:data.asOf,commodities:specs.map(([code,name,ticker,unit,pricePrefix,decimals]) => ({
      code,name,ticker,unit,pricePrefix,decimals,category:'Test',asOf:data.asOf,
      history:data.pairs[0].history.map((p,i) => ({date:p.date,close:100+i+0.1234}))
    }))};
}

test('commodities route has nine charts with explicit units and independent late responses', async () => {
  const p = page('#commodities');
  assert.equal(p.node('#view-commodities').style.display,'block');
  assert.match(p.node('#commodities-content').innerHTML,/Loading daily commodity/);
  respond(p,'data/fx.json',fxPayload());
  respond(p,'data/results.json',payload('KOREA','KRW'));
  await settle();
  assert.equal(p.node('#view-commodities').style.display,'block');
  respond(p,'data/commodities.json',commoditiesPayload());
  await settle();
  const html = p.node('#commodities-content').innerHTML;
  assert.equal((html.match(/<article /g)||[]).length,9);
  assert.match(html,/Gold/); assert.match(html,/Natural gas/); assert.match(html,/Soybeans/);
  assert.match(html,/USD \/ MMBtu/); assert.match(html,/US cents \/ bushel/);
  assert.match(html,/US¢129\.12/); assert.match(html,/\$129\.1234/);
  assert.doesNotMatch(html,/₩|JPY|NaN|Infinity/);
  assert.equal(p.node('#nav-commodities')['aria-current'],'page');
  p.go('#home');
  assert.match(p.node('#home-commodities-status').textContent,/9 futures/);
  p.go('#fx');
  assert.match(p.node('#fx-content').innerHTML,/JPY \/ KRW/);
  assert.equal(p.node('#view-commodities').style.display,'none');
});

test('commodities settings and custom ranges never alter FX settings or prices', async () => {
  const p = page('#commodities');
  respond(p,'data/commodities.json',commoditiesPayload());
  respond(p,'data/fx.json',fxPayload());
  await settle();
  p.evaluate('commoditiesDashboard.range="dates"; commoditiesDashboard.start="2026-11-10"; commoditiesDashboard.end="2026-11-10"; commoditiesDashboard.settings.fast=5; commoditiesDashboard.settings.averages=true; commoditiesDashboard.render()');
  const html = p.node('#commodities-content').innerHTML;
  assert.match(html,/2026-11-10 · selected end/);
  assert.match(html,/1 observations/);
  assert.match(html,/SMA 5/);
  assert.doesNotMatch(p.evaluate('commoditiesDashboard.cardBody(commoditiesDashboard.state.data.commodities[0])'),/2026-11-17|NaN|Infinity/);
  assert.equal(p.evaluate('fxDashboard.settings.fast'),20);
  assert.equal(p.evaluate('fxDashboard.range'),'1M');
  p.go('#fx');
  assert.doesNotMatch(p.node('#fx-content').innerHTML,/SMA 20/);
});

test('malformed or unavailable commodities do not disable existing pages', async () => {
  for (const kind of ['offline','future','unit','prefix','missing','nan']) {
    const p=page('#commodities'), data=commoditiesPayload();
    if (kind==='future') data.commodities[0].history.at(-1).date='2026-11-18';
    if (kind==='unit') data.commodities[7].unit='USD / bushel';
    if (kind==='prefix') data.commodities[7].pricePrefix='$';
    if (kind==='missing') data.commodities.pop();
    if (kind==='nan') data.commodities[0].history[0].close=NaN;
    if (kind==='offline') p.pending['data/commodities.json'].reject(new Error('offline'));
    else respond(p,'data/commodities.json',data);
    respond(p,'data/fx.json',fxPayload());
    await settle();
    assert.match(p.node('#commodities-content').innerHTML,/Commodities data is unavailable/);
    p.go('#fx');
    assert.match(p.node('#fx-content').innerHTML,/JPY \/ KRW/);
  }
});

test('zero and negative futures preserve linear indicators and restart percentage rules safely', async () => {
  const rows=analyze([100,110,-37.63,0,10,11],{fast:2,channel:2,x:10});
  assert.equal(rows[2].close,-37.63);
  assert.equal(rows[2].fast,(110-37.63)/2);
  assert.equal(rows[2].breakout,'Down');
  assert.equal(rows[2].state,'Unavailable');
  assert.equal(rows[3].change,null);
  assert.equal(rows[4].change,null);
  assert.equal(rows[4].state,'Warming up');
  assert.equal(rows[5].signal,'Long');
  const p=page('#commodities'), data=commoditiesPayload();
  data.commodities[3].history.at(-2).close=0;
  data.commodities[3].history.at(-1).close=-37.63;
  respond(p,'data/commodities.json',data);
  await settle();
  assert.match(p.node('#commodities-content').innerHTML,/\$-37.63/);
  assert.doesNotMatch(p.node('#commodities-content').innerHTML,/NaN|Infinity/);
});

function assetPayload(kind) {
  // Use the published schema/metadata; keep fixture dates small and deterministic.
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data', `${kind}.json`), 'utf8'));
  // These are legacy index fixtures. Rate tests attach dated synthetic rates.
  delete data.rates;
  const key = kind === 'crypto' ? 'assets' : 'bonds';
  data.snapshotAt = '2026-11-18T21:00:00+09:00';
  data.asOf = '2026-11-17';
  data[key].forEach(item => {
    item.history = fxPayload().pairs[0].history.map(p => ({...p}));
    if (item.country === 'KR') item.history.push({date:'2026-11-18', close:1030});
    item.asOf = item.history.at(-1).date;
  });
  return data;
}

test('crypto and bond routes show only their instruments, correct units and country groups', async () => {
  const p = page('#crypto');
  respond(p,'data/bonds.json',assetPayload('bonds'));
  respond(p,'data/crypto.json',assetPayload('crypto'));
  await settle();
  assert.equal(p.node('#view-crypto').style.display,'block');
  assert.equal((p.node('#crypto-content').innerHTML.match(/<article /g)||[]).length,2);
  assert.match(p.node('#crypto-content').innerHTML,/Bitcoin/);
  assert.match(p.node('#crypto-content').innerHTML,/Ethereum/);
  assert.match(p.node('#crypto-content').innerHTML,/USD \/ BTC/);
  p.go('#bonds');
  const html = p.node('#bonds-content').innerHTML;
  assert.equal((html.match(/<article /g)||[]).length,9);
  assert.match(html,/Korea/); assert.match(html,/United States/);
  assert.match(html,/1,030.00/); assert.match(html,/1,029.00/);
  assert.doesNotMatch(html,/₩|\$|ETF/);
  assert.match(html,/2026-11-18/); assert.match(html,/2026-11-17/);
  assert.equal(p.node('#view-crypto').style.display,'none');
  p.go('#home');
  assert.match(p.node('#home-crypto-status').textContent,/2 cryptocurrencies/);
  assert.match(p.node('#home-bonds-status').textContent,/9 indices/);
});

test('new dashboard controls remain independent and shorter index history does not restrict other indices', async () => {
  const p=page('#bonds'), data=assetPayload('bonds');
  data.bonds[2].history = data.bonds[2].history.slice(5);
  respond(p,'data/bonds.json',data);
  respond(p,'data/crypto.json',assetPayload('crypto'));
  await settle();
  assert.match(p.node('#bonds-content').innerHTML,/min="2026-10-19"/);
  p.evaluate('bondsDashboard.range="dates"; bondsDashboard.start="2026-10-19"; bondsDashboard.end="2026-10-20"; bondsDashboard.settings.fast=5; bondsDashboard.render()');
  assert.match(p.node('#bonds-content').innerHTML,/No observations in this range/);
  assert.match(p.node('#bonds-content').innerHTML,/2 observations/);
  assert.equal(p.evaluate('cryptoDashboard.settings.fast'),20);
  assert.equal(p.evaluate('cryptoDashboard.range'),'1M');
  assert.equal(p.evaluate('fxDashboard.settings.fast'),20);
  assert.equal(p.evaluate('commoditiesDashboard.settings.fast'),20);
});

test('bad crypto or bond batches fail independently; current UTC and US bars are rejected', async () => {
  for (const kind of ['crypto','bonds']) for (const error of ['future','missing','unit','negative']) {
    const p=page(`#${kind}`), data=assetPayload(kind), items=data[kind==='crypto'?'assets':'bonds'];
    if (error==='future') items.at(-1).history.at(-1).date='2026-11-18';
    if (error==='missing') items.pop();
    if (error==='unit') items[0].unit='wrong';
    if (error==='negative') items[0].history[0].close=-1;
    respond(p,`data/${kind}.json`,data);
    respond(p,'data/results.json',payload('KOREA','KRW'));
    await settle();
    assert.match(p.node(`#${kind}-content`).innerHTML,/data is unavailable/);
    p.go('#KOSPImatches'); assert.match(p.node('#rows').innerHTML,/KOREA/);
  }
});

test('Japan and Hong Kong match routes retain local currencies and independent loading', async () => {
  const p=page('#JapanMatches');
  respond(p,'data/results-hk.json',payload('0005.HK','HKD'));
  respond(p,'data/results-japan.json',payload('285A.T','JPY'));
  await settle();
  assert.equal(p.node('#matches-title').textContent,'Japan Matches.');
  assert.match(p.node('#matches-subtitle').textContent,/Nikkei 225/);
  assert.match(p.node('#rows').innerHTML,/¥/);
  assert.match(p.node('#prices-body').innerHTML,/>100.25</);
  assert.doesNotMatch(p.node('#rows').innerHTML,/0005.HK/);
  p.go('#HKmatches');
  assert.equal(p.node('#matches-title').textContent,'Hong Kong Matches.');
  assert.match(p.node('#rows').innerHTML,/HK\$/);
  assert.match(p.node('#prices-body').innerHTML,/>100.25</);
  assert.doesNotMatch(p.node('#prices-body').innerHTML,/HK\$/);
});

test('chart indicators start off; input applies SMA immediately without a submit', async () => {
  const p=page('#fx'); respond(p,'data/fx.json',fxPayload()); await settle();
  assert.doesNotMatch(p.node('#fx-content').innerHTML,/SMA 20|Filter rule|Support<\/span>/);
  assert.equal(p.evaluate('fxDashboard.settings.averages'),false);
  assert.equal(p.evaluate('fxDashboard.settings.bands'),false);
  assert.equal(p.evaluate('fxDashboard.settings.filter'),false);
  for (const [key,value] of Object.entries({fast:10,slow:50,channel:20,x:1,y:0.5,lookback:20,hold:0,mode:'running','hold-mode':'minimum'})) p.node(`#fx-${key}`).value=String(value);
  for (const key of ['neutral','averages','bands','filter']) p.node(`#fx-${key}`).checked=key==='averages';
  p.node('#fx-controls').handlers.input();
  assert.match(p.node('#fx-content').innerHTML,/SMA 10/);
  assert.doesNotMatch(p.node('#fx-content').innerHTML,/<span>Filter rule<\/span>/);
  assert.equal(p.evaluate('commoditiesDashboard.settings.averages'),false);
  p.node('#fx-fast').value='';p.node('#fx-controls').handlers.input();
  assert.equal(p.evaluate('fxDashboard.settings.fast'),10);
  assert.ok(p.node('#fx-error').textContent);
});

test('chart ranges are independent, support MAX and keep daily indicator prehistory', async () => {
  const p=page('#fx');respond(p,'data/fx.json',fxPayload());await settle();
  p.evaluate('fxDashboard.selections.set("USD",{range:"dates",start:"2026-11-09",end:"2026-11-10",days:90}); fxDashboard.settings.averages=true; fxDashboard.render()');
  assert.equal(p.evaluate('fxDashboard.rendered.get("USD").history.length'),2);
  assert.equal(p.evaluate('fxDashboard.rendered.get("EUR").history.length'),30);
  assert.equal(p.evaluate('fxDashboard.rendered.get("USD").history[0].fast'),1011.5);
  assert.equal(p.evaluate('fxDashboard.window(fxDashboard.state.data.pairs[0].history,"MAX").length'),30);
  assert.match(p.node('#fx-content').innerHTML,/id="fx-USD-range"/);
  assert.match(p.node('#fx-content').innerHTML,/id="fx-EUR-range"/);
  assert.equal(p.evaluate('fxDashboard.rendered.get("USD").history.at(-1).date'),'2026-11-10');
});


function ratePayload(p) {
  return p.evaluate(`bondRateSpecs.map(([code,name,country,lagDays])=>({code,name,country,lagDays,unit:'Percent',
    status:'current',fetchedAt:'2026-11-18T21:02:00+09:00',asOf:new Date(Date.parse('2026-11-18')-lagDays*86400000).toISOString().slice(0,10),
    history:[{date:new Date(Date.parse('2026-11-17')-lagDays*86400000).toISOString().slice(0,10),close:3},
             {date:new Date(Date.parse('2026-11-18')-lagDays*86400000).toISOString().slice(0,10),close:code==='ffr-upper'?3.25:3.025}]}))`);
}

test('bond rates and Home show percent levels, bp changes and a correctly paired Fed target range',async()=>{
  const p=page('#bonds'),data=assetPayload('bonds');data.rates=ratePayload(p);
  respond(p,'data/bonds.json',data);await settle();
  const html=p.node('#bonds-rates').innerHTML;
  assert.match(html,/BOK base rate/);assert.match(html,/US 30Y/);assert.match(html,/Korea 20Y/);
  assert.match(html,/3\.025%/);assert.match(html,/\+2\.5 bp/);
  assert.match(html,/3\.03–3\.25%/);assert.match(html,/2026-11-16/);
  assert.match(p.node('#bonds-content').innerHTML,/Total return/);
  p.go('#home');
  assert.match(p.node('#home-rates-summary').innerHTML,/Fed target range/);
  assert.match(p.node('#home-rates-summary').innerHTML,/Korea 10Y/);
  assert.match(p.node('#home-rates-summary').innerHTML,/US 2Y/);
  assert.doesNotMatch(p.node('#home-rates-summary').innerHTML,/US 30Y|<svg/);
  p.evaluate('bondsDashboard.selections.set("kr-3y",{range:"7D"});renderHomeSummary()');
  assert.match(p.node('#home-rates-summary').innerHTML,/3\.025%/);
});

test('rate source outages and unpaired target dates are explicit while bond indices remain available',async()=>{
  const p=page('#bonds'),data=assetPayload('bonds');data.rates=ratePayload(p);
  data.rates[0].status='stale';data.rates[1]={...data.rates[1],history:[],asOf:null,fetchedAt:null,status:'unavailable'};
  const upper=data.rates[8];upper.history.pop();upper.asOf=upper.history.at(-1).date;
  respond(p,'data/bonds.json',data);await settle();
  assert.match(p.node('#bonds-rates').innerHTML,/Delayed/);
  assert.match(p.node('#bonds-rates').innerHTML,/Unavailable \/ dates differ/);
  assert.match(p.node('#bonds-content').innerHTML,/Total return/);
  p.go('#home');assert.match(p.node('#home-rates-summary').innerHTML,/Delayed/);
});

test('rate validation rejects future observations, wrong units and inverted targets; legacy bonds still render',async()=>{
  for(const kind of ['future','unit','inverted','missing','nan']) {
    const p=page('#bonds'),data=assetPayload('bonds');data.rates=ratePayload(p);
    if(kind==='future') data.rates[10].history.at(-1).date='2026-11-18';
    if(kind==='unit') data.rates[0].unit='Basis points';
    if(kind==='inverted') data.rates[7].history.at(-1).close=9;
    if(kind==='missing') data.rates.pop();
    if(kind==='nan') data.rates[0].history.at(-1).close=NaN;
    respond(p,'data/bonds.json',data);await settle();
    assert.match(p.node('#bonds-content').innerHTML,/data is unavailable/);
  }
  const p=page('#bonds');respond(p,'data/bonds.json',assetPayload('bonds'));await settle();
  assert.match(p.node('#bonds-content').innerHTML,/Total return/);
  assert.match(p.node('#bonds-rates').innerHTML,/Unavailable/);
});

test('the real published bond payload passes browser validation and renders its rate dates',async()=>{
  const p=page('#bonds'),data=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/bonds.json'),'utf8'));
  respond(p,'data/bonds.json',data);await settle();
  assert.equal(p.evaluate('bondsDashboard.state.error'),undefined);
  assert.equal((p.node('#bonds-content').innerHTML.match(/<article /g)||[]).length,9);
  for (const item of data.rates || []) if(item.asOf) assert.ok(p.node('#bonds-rates').innerHTML.includes(item.asOf));
});
