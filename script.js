// Route configuration and independently loaded market state.
const markets = {
  kospi: { name: "KOSPI", route: "#KOSPImatches", file: "data/results.json", currency: "KRW", symbol: "₩", source: "KRX" },
  us: { name: "US", route: "#USmatches", file: "data/results-us.json", currency: "USD", symbol: "$", source: "Yahoo Finance" },
  japan: {name:"Japan",route:"#JapanMatches",file:"data/results-japan.json",currency:"JPY",symbol:"¥",source:"Nikkei / Yahoo Finance"},
  hk: {name:"Hong Kong",route:"#HKmatches",file:"data/results-hk.json",currency:"HKD",symbol:"HK$",source:"Hang Seng Indexes / Yahoo Finance"},
};
const state = Object.fromEntries(Object.keys(markets).map(key => [key,{loading:true}]));
let trackingState = { loading: true };
const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// Display formatting does not alter the generated result data.
function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatUpdated(value, dateOnly = false) {
  // Older KOSPI files contain local Korean timestamps without an offset.
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+09:00`;
  if (dateOnly) return new Date(timestamp).toLocaleDateString(undefined, {
    timeZone: "Asia/Seoul", year: "numeric", month: "short", day: "numeric",
  });
  return new Date(timestamp).toLocaleString(undefined, {
    timeZone: "Asia/Seoul", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }) + " KST";
}

function formatSnapshot(value) {
  return `${formatDate(value.slice(0, 10))} · 9 PM KST`;
}

function formatPrice(value, market) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(market.currency === "KRW" ? "ko-KR" : "en-US", {
    minimumFractionDigits: ["USD","HKD"].includes(market.currency) ? 2 : 0,
    maximumFractionDigits: market.currency === "KRW" ? 0 : 2,
  }).format(value);
}

function formatCap(stock, market) {
  const value = stock.marketCap;
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const korean = market.currency === "KRW";
  const trillion = value >= 1e12;
  const divisor = trillion ? 1e12 : korean ? 1e8 : 1e9;
  const unit = korean ? (trillion ? "조" : "억") : (trillion ? "tn" : "bn");
  const amount = new Intl.NumberFormat(korean ? "ko-KR" : "en-US", {
    maximumFractionDigits: 1,
  }).format(value / divisor);
  return `${stock.marketCapMethod === "estimated" ? "≈ " : ""}${market.symbol}${amount}${unit}`;
}

// Market routes share one set of tables; clear them before each render.
function activeMarket() {
  const found = Object.keys(markets).find(key => markets[key].route === window.location.hash);
  if (found) return found;
  if (["#KOSPImatches", "#matches"].includes(window.location.hash)) return "kospi";
  return null;
}

function setMessage(message) {
  $("#rows").innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHTML(message)}</td></tr>`;
}

function renderMarket(key) {
  const market = markets[key];
  const { data, error, loading } = state[key];
  $("#matches-title").textContent = `${market.name} Matches.`;
  $("#matches-subtitle").textContent = key === "us"
    ? "Nasdaq-100 or S&P 500 stocks crossing the volume and price thresholds."
    : key === "japan" ? "Nikkei 225 stocks crossing the volume and price thresholds."
    : key === "hk" ? "Hang Seng stocks crossing the volume and price thresholds."
    : "KOSPI 200 stocks crossing the volume and price thresholds.";
  $("#market-cap-heading").textContent = "Market cap";
  $("#prices-subtitle").textContent = `Daily closing prices (${market.symbol}) over the base and evaluation windows.`;
  $("#matches-source").textContent = `${market.source}.`;
  $("#matches-updated").textContent = "";
  $("#market-cap-note").textContent = "";
  for (const selector of ["#prices-head", "#prices-body", "#normalized-head", "#normalized-body"]) $(selector).replaceChildren();
  $("#prices-section").style.display = "none";
  $("#normalized-section").style.display = "none";
  $("#match-vol-metric").textContent = `${Number(data?.volumeMultiplier ?? 1.5).toFixed(1)}×`;
  $("#match-price-metric").textContent = `${Number(data?.priceMultiplier ?? 1.1).toFixed(1)}×`;
  // Earlier saved snapshots used calendar days for both windows.
  const tradingEvaluation = !data || data.evalTradingDays != null;
  $("#match-eval-metric").textContent = `${tradingEvaluation ? data?.evalTradingDays ?? 3 : data.windowDays ?? 5} Days`;
  $("#match-eval-label").textContent = `Evaluation · ${tradingEvaluation ? "trading" : "calendar"} days`;
  $("#match-base-metric").textContent = `${data?.baseCalendarDays ?? data?.windowDays ?? 5} Days`;
  if (loading || error) {
    $("#asof").textContent = `${market.name} · ${loading ? "Loading…" : "Unavailable"}`;
    setMessage(loading ? `Loading ${market.name} results…` : `Couldn't load ${market.name} results. Please try again later.`);
    return;
  }
  $("#asof").textContent = `Updated ${formatUpdated(data.generatedAt, true)}`;
  const snapshotNote = !data.snapshotAt ? "" : data.snapshotAt.slice(0, 10) === data.asOf
    ? " · 9 PM KST snapshot" : ` · Snapshot: ${formatSnapshot(data.snapshotAt)}`;
  $("#matches-updated").textContent = `Prices & caps: ${formatDate(data.asOf)}${snapshotNote}.`;
  if (!tradingEvaluation) $("#matches-updated").textContent += " Earlier snapshot: 5-calendar-day evaluation.";
  if (data.stocks.length === 0) {
    setMessage(`No ${market.name} stocks matched the criteria for ${formatDate(data.asOf)}.`);
    return;
  }
  $("#prices-section").style.display = "flex";
  $("#normalized-section").style.display = "flex";
  const capNotes = [];
  if (data.stocks.some((stock) => stock.marketCapMethod === "estimated")) capNotes.push("≈ Estimated cap (close × reported shares).");
  if (data.stocks.some((stock) => stock.marketCap == null)) capNotes.push("— Cap unavailable.");
  $("#market-cap-note").textContent = capNotes.join(" ");
  $("#rows").innerHTML = data.stocks.map((stock) => `<tr>
    <td class="highlight">${escapeHTML(stock.ticker)}</td>
    <td><strong>${escapeHTML(stock.name)}</strong></td>
    <td class="market-cap">${formatCap(stock, market)}</td>
    <td>${stock.volumeRatio.toFixed(2)}</td><td>${stock.priceRatio.toFixed(2)}</td>
  </tr>`).join("");
  const headers = `<tr><th>Date</th>${data.stocks.map((stock) => `<th>${escapeHTML(stock.name)} (${escapeHTML(stock.ticker)})<span class="stock-market-cap" title="Market cap" aria-label="Market cap: ${formatCap(stock, market)}">${formatCap(stock, market)}</span></th>`).join("")}</tr>`;
  $("#prices-head").innerHTML = headers;
  $("#normalized-head").innerHTML = headers;
  const bases = data.stocks.map((stock) => stock.closes.find((value) => value !== null && value !== undefined));
  $("#prices-body").innerHTML = data.dates.map((day, i) => `<tr><td>${escapeHTML(day)}</td>${data.stocks.map((stock) => `<td>${formatPrice(stock.closes[i], market)}</td>`).join("")}</tr>`).join("");
  $("#normalized-body").innerHTML = data.dates.map((day, i) => `<tr><td>${escapeHTML(day)}</td>${data.stocks.map((stock, j) => {
    const value = stock.closes[i];
    return `<td>${value == null || !bases[j] ? "—" : Math.round(value / bases[j] * 100)}</td>`;
  }).join("")}</tr>`).join("");
}

function visibleEpisodes(data) {
  return data.episodes.filter((episode) => episode.status === "active"
    || episode.completedAsOf === data.markets[episode.market]?.asOf)
    .sort((a, b) => (a.status === "ended") - (b.status === "ended")
      || a.foundDate.localeCompare(b.foundDate) || a.id.localeCompare(b.id));
}

function trackingChart(episode) {
  const values = episode.history.map((point) => point.close);
  if (values.length < 2) return ""; // A discovery close has no movement yet.
  const low = Math.min(...values), high = Math.max(...values);
  const points = values.map((value, index) => [
    values.length === 1 ? 300 : 10 + index / (values.length - 1) * 580,
    high === low ? 55 : 95 - (value - low) / (high - low) * 80,
  ]);
  const last = points.at(-1);
  return `<svg class="tracking-chart" viewBox="0 0 600 110" role="img" aria-label="Closing-price movement for ${escapeHTML(episode.name)}; exact values follow in the table">
    <polyline points="${points.map((point) => point.join(",")).join(" ")}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" />
    <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="currentColor" />
  </svg>`;
}

function renderTracking() {
  const { data, loading, error } = trackingState;
  $("#tracking-updated").textContent = "";
  $("#tracking-started").textContent = "";
  if (loading || error) {
    $("#asof").textContent = loading ? "Loading…" : "Tracking unavailable";
    $("#tracking-cards").innerHTML = `<p class="empty-state">${loading ? "Loading tracking…" : "Couldn't load tracking. Please try again later."}</p>`;
    return;
  }
  $("#asof").textContent = `Updated ${formatUpdated(data.generatedAt, true)}`;
  $("#tracking-updated").textContent = Object.entries(data.markets).map(([key,value])=>`${markets[key].name}: ${formatDate(value.asOf)}`).join(" · ") + ` · ${formatSnapshot(data.snapshotAt)}.`;
  $("#tracking-started").textContent = `Tracking started ${formatUpdated(data.startedAt, true)}, seeded from that snapshot’s matches.`;
  const episodes = visibleEpisodes(data);
  if (!episodes.length) {
    $("#tracking-cards").innerHTML = '<p class="empty-state">No stocks are being tracked yet. New screener matches will appear here automatically.</p>';
    return;
  }
  $("#tracking-cards").innerHTML = episodes.map((episode) => {
    const market = markets[episode.market];
    const count = episode.survivedSessions;
    const unit = count === 1 ? "session" : "sessions";
    const ended = episode.status === "ended";
    const status = ended ? `Fell after ${count} ${unit}` : `Tracking · ${count} ${unit}`;
    const first = episode.history[0], last = episode.history.at(-1);
    const change = (last.close / first.close - 1) * 100;
    return `<article class="tracking-card${ended ? " tracking-ended" : ""}">
      <div class="tracking-card-header">
        <div><h3>${escapeHTML(episode.name)} <span class="tracking-ticker">${escapeHTML(episode.ticker)} · ${market.name}</span></h3>
        <p class="tracking-meta">Found ${formatDate(episode.foundDate)}</p></div>
        <div class="tracking-result"><p class="tracking-status">${status}</p>
        <p class="tracking-meta">${change >= 0 ? "+" : ""}${change.toFixed(2)}% since discovery</p></div>
      </div>
      ${trackingChart(episode)}
      <div class="table-container"><table class="tracking-history">
        <caption>Close (${market.symbol})</caption>
        <thead><tr>${episode.history.map((point) => `<th scope="col">${escapeHTML(point.date)}${ended && point.date === episode.endedDate ? '<span class="history-marker">First drop</span>' : ""}</th>`).join("")}</tr></thead>
        <tbody><tr>${episode.history.map((point) => `<td>${formatPrice(point.close, market)}</td>`).join("")}</tr></tbody>
      </table></div>
    </article>`;
  }).join("");
}

async function loadTracking() {
  try {
    const response = await fetch(`data/tracking.json?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.schemaVersion !== 1 || !Array.isArray(data.episodes) || !data.markets?.kospi?.asOf
        || !data.markets?.us?.asOf || !data.generatedAt || !data.startedAt || !data.snapshotAt
        || data.episodes.some((episode) => !markets[episode.market] || !episode.history?.length
          || !["active", "ended"].includes(episode.status)
          || episode.history.some((point) => !Number.isFinite(point.close) || point.close <= 0))) {
      throw new Error("Invalid tracking payload");
    }
    trackingState = { data, loading: false };
    const count = visibleEpisodes(data).length;
    $("#count-tracking").textContent = `${count} ${count === 1 ? "stock" : "stocks"} followed`;
  } catch (error) {
    console.error("Tracking:", error);
    trackingState = { error: true, loading: false };
  }
  syncView();
}

// Late data responses must always render the currently selected route.
function syncView(scroll = false) {
  const key = activeMarket();
  const tracking = window.location.hash === "#tracking";
  const fx = window.location.hash === "#fx";
  const commodities = window.location.hash === "#commodities";
  const equities = !!key || tracking || ["#overview", "#equities"].includes(window.location.hash);
  const crypto = window.location.hash === "#crypto";
  const bonds = window.location.hash === "#bonds";
  const indices = window.location.hash === "#indices";
  const metrics = window.location.hash === "#metrics";
  const home = !metrics && !equities && !fx && !commodities && !crypto && !bonds && !indices;
  const current = tracking ? "tracking" : key || "overview";
  for (const page of ["overview", ...Object.keys(markets), "tracking"]) {
    $(`#nav-${page}`).setAttribute("aria-current", page === current ? "page" : "false");
  }
  $("#nav-home").setAttribute("aria-current", home ? "page" : "false");
  $("#nav-equities").setAttribute("aria-current", equities ? "page" : "false");
  $("#nav-fx").setAttribute("aria-current", fx ? "page" : "false");
  $("#nav-commodities").setAttribute("aria-current", commodities ? "page" : "false");
  $("#nav-crypto").setAttribute("aria-current", crypto ? "page" : "false");
  $("#nav-bonds").setAttribute("aria-current", bonds ? "page" : "false");
  $("#nav-indices").setAttribute("aria-current", indices ? "page" : "false");
  $("#nav-metrics").setAttribute("aria-current", metrics ? "page" : "false");
  $("#view-metrics").style.display = metrics ? "block" : "none";
  $("#view-indices").style.display = indices ? "block" : "none";
  $("#view-crypto").style.display = crypto ? "block" : "none";
  $("#view-bonds").style.display = bonds ? "block" : "none";
  $("#equity-navigation").style.display = equities ? "flex" : "none";
  $("#view-home").style.display = home ? "block" : "none";
  $("#view-fx").style.display = fx ? "block" : "none";
  $("#view-commodities").style.display = commodities ? "block" : "none";
  $("#view-overview").style.display = equities && !key && !tracking ? "block" : "none";
  $("#view-matches").style.display = key ? "block" : "none";
  $("#view-tracking").style.display = tracking ? "block" : "none";
  if (fx) fxDashboard.render();
  else if (commodities) commoditiesDashboard.render();
  else if (crypto) cryptoDashboard.render();
  else if (bonds) bondsDashboard.render();
  else if (indices) indicesDashboard.render();
  else if (metrics) metricsDashboard.render();
  else if (tracking) renderTracking();
  else if (key) renderMarket(key);
  else {
    const entries = [...Object.values(state), ...(home ? [fxDashboard.state, commoditiesDashboard.state, cryptoDashboard.state, bondsDashboard.state, indicesDashboard.state, metricsDashboard.state] : [])];
    const latest = entries.map((entry) => entry.data?.generatedAt).filter(Boolean).sort().at(-1);
    $("#asof").textContent = latest ? `Updated ${formatUpdated(latest, true)}`
      : entries.some((entry) => entry.loading) ? "Loading…" : "Update unavailable";
  }
  const snapshots = Object.values(state).map((entry) => entry.data?.snapshotAt);
  $("#snapshot-status").textContent = snapshots.every(Boolean) && snapshots.every(stamp => stamp === snapshots[0])
    ? `Snapshot: ${formatSnapshot(snapshots[0])}.`
    : "Daily 9 PM KST snapshots; see each market for its cutoff.";
  $("#home-equities-status").textContent = Object.entries(state).map(([key, value]) => value.data
    ? `${markets[key].name}: ${formatDate(value.data.asOf)}` : `${markets[key].name}: ${value.loading ? "loading" : "unavailable"}`).join(" · ");
  $("#home-fx-status").textContent = fxDashboard.state.data ? `8 currencies · Coverage through ${formatDate(fxDashboard.state.data.asOf)}`
    : fxDashboard.state.loading ? "Loading FX snapshot…" : "FX snapshot unavailable";
  $("#home-commodities-status").textContent = commoditiesDashboard.state.data ? `9 futures · Coverage through ${formatDate(commoditiesDashboard.state.data.asOf)}`
    : commoditiesDashboard.state.loading ? "Loading commodities snapshot…" : "Commodities snapshot unavailable";
  $("#home-crypto-status").textContent = cryptoDashboard.state.data ? `2 cryptocurrencies · Through ${formatDate(cryptoDashboard.state.data.asOf)}` : cryptoDashboard.state.loading ? "Loading crypto snapshot…" : "Crypto snapshot unavailable";
  $("#home-bonds-status").textContent = bondsDashboard.state.data ? `9 indices · Through ${formatDate(bondsDashboard.state.data.asOf)}` : bondsDashboard.state.loading ? "Loading bond snapshot…" : "Bond snapshot unavailable";
  $("#home-indices-status").textContent = indicesDashboard.state.data ? `9 indices · Four markets · Through ${formatDate(indicesDashboard.state.data.asOf)}` : indicesDashboard.state.loading ? "Loading index snapshot…" : "Index snapshot unavailable";
  const metricData = metricsDashboard.state.data;
  $("#home-metrics-status").textContent = metricData
    ? `${metricData.metrics.filter(p => p.status === 'current').length}/5 refreshed · Observation dates vary`
    : metricsDashboard.state.loading ? 'Loading metrics…' : 'Metrics unavailable';
  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadMarket(key) {
  const market = markets[key];
  try {
    const response = await fetch(`${market.file}?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.stocks) || !Array.isArray(data.dates) || !data.asOf || !data.generatedAt) throw new Error("Invalid results payload");
    state[key] = { data, loading: false };
    $(`#count-${key}`).textContent = `${data.stocks.length} ${data.stocks.length === 1 ? "match" : "matches"}`;
    $(`#${key}-date`).textContent = `${market.name} close: ${formatDate(data.asOf)}`;
  } catch (error) {
    console.error(`${market.name} results:`, error);
    state[key] = { error: true, loading: false };
    $(`#${key}-date`).textContent = `${market.name} results unavailable`;
  }
  // A late response from one market must never overwrite the other view.
  syncView();
}

window.addEventListener("hashchange", () => syncView(true));
syncView();
Promise.allSettled(Object.keys(markets).map(loadMarket));
loadTracking();
fxDashboard.init();
commoditiesDashboard.init();

cryptoDashboard.init();
bondsDashboard.init();
indicesDashboard.init();

metricsDashboard.init();
// Recompute SVG coordinates when a phone rotates; per-chart selections survive.
window.addEventListener('resize', () => {
  const dashboard = [fxDashboard,commoditiesDashboard,cryptoDashboard,bondsDashboard,indicesDashboard,metricsDashboard]
    .find(d => `#${d.config.id}` === window.location.hash);
  if (dashboard?.state.data) dashboard.render();
});
