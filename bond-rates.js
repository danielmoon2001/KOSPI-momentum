// Percent levels and basis-point changes are separate from total-return indices.
const bondRateSpecs = [
  ['bok','BOK base rate','KR',0],
  ...[2,3,5,10,20,30].map(n=>[`kr-${n}y`,`Korea ${n}Y`,'KR',1]),
  ['ffr-lower','Fed target lower','US',1],['ffr-upper','Fed target upper','US',1],
  ['effr','Effective fed funds','US',2],
  ...['3m','1y','2y','5y','10y','20y','30y'].map(n=>[`us-${n}`,`US ${n.toUpperCase()}`,'US',1])
];

function validateBondRates(data) {
  if (data.rates === undefined) return; // Historical index-only snapshots.
  if (!Array.isArray(data.rates) || data.rates.length !== bondRateSpecs.length) throw new Error('Missing bond rates');
  data.rates.forEach((item,i)=>{
    const [code,name,country,lag] = bondRateSpecs[i];
    const end = new Date(Date.parse(data.snapshotAt.slice(0,10))-lag*86400000).toISOString().slice(0,10);
    const h=item.history;
    if (item.code!==code || item.name!==name || item.country!==country || item.lagDays!==lag || item.unit!=='Percent'
        || !Array.isArray(h) || h.length>40 || h.some((p,j)=>!historyDate(p.date) || p.date>end
          || !Number.isFinite(p.close) || p.close < -10 || p.close > 100 || (j && p.date<=h[j-1].date))) throw new Error('Invalid bond rate');
    if (item.status==='unavailable') {
      if (h.length || item.asOf!==null || item.fetchedAt!==null) throw new Error('Unavailable rate has values');
    } else if (['current','stale'].includes(item.status)) {
      if (!h.length || item.asOf!==h.at(-1).date || !item.fetchedAt
          || (item.status==='current' && Date.parse(data.snapshotAt.slice(0,10))-Date.parse(item.asOf)>7*86400000)) throw new Error('Invalid rate date');
    } else throw new Error('Invalid rate status');
  });
  const [lower,upper]=data.rates.slice(7,9);
  if (lower.asOf && lower.asOf===upper.asOf && lower.history.at(-1).close>upper.history.at(-1).close) throw new Error('Inverted Fed range');
}

function bondRateRow(code) {
  const rates=bondsDashboard.state.data?.rates || [];
  const item=rates.find(p=>p.code===code);
  const name=code==='ffr' ? 'Fed target range' : bondRateSpecs.find(p=>p[0]===code)?.[1] || code;
  if (code==='ffr') {
    const low=rates.find(p=>p.code==='ffr-lower'), high=rates.find(p=>p.code==='ffr-upper');
    if (!low?.history.length || !high?.history.length || low.asOf!==high.asOf) return homeRow(name,'—','','Unavailable / dates differ');
    const value=`${historyNumber(low.history.at(-1).close,2)}–${historyNumber(high.history.at(-1).close,2)}%`;
    return homeRow(name,value,'',`${low.asOf}${[low,high].some(p=>p.status==='stale')?' · Delayed':''}`);
  }
  if (!item?.history.length) return homeRow(name,'—','','Unavailable');
  const last=item.history.at(-1), prior=item.history.at(-2);
  const delta=prior ? (last.close-prior.close)*100 : null;
  return homeRow(name,`${historyNumber(last.close,code==='bok'?2:3)}%`,
    delta===null ? '—' : `${delta>=0?'+':''}${historyNumber(delta,1)} bp`,
    `${last.date}${item.status==='stale'?' · Delayed':''}`);
}

function renderBondRates() {
  const {data,loading}=bondsDashboard.state;
  $('#bonds-rates').innerHTML = !data
    ? `<p class="fx-muted">${loading?'Loading rates…':'Rates unavailable.'}</p>`
    : `<h2 class="history-group-title">Policy rates &amp; yields</h2>
      <p class="fx-muted">Annual % · Change vs previous observation in bp · Dates shown per rate</p>
      <div class="bond-rate-groups">${[
        ['Korea',['bok',...['2','3','5','10','20','30'].map(n=>`kr-${n}y`)]],
        ['United States',['ffr','effr',...['3m','1y','2y','5y','10y','20y','30y'].map(n=>`us-${n}`)]]
      ].map(([name,codes])=>`<section class="bond-rate-panel"><h3>${name}</h3><ul class="home-quotes">${codes.map(bondRateRow).join('')}</ul></section>`).join('')}</div>
      <p class="fx-muted">BOK ECOS · Federal Reserve / FRED · <a href="docs/BOND-RATES.md">Sources &amp; timing</a></p>`;
}
