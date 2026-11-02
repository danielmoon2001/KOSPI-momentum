const markets = {
  kospi: { name: "KOSPI", route: "#KOSPImatches", file: "data/results.json", currency: "KRW", symbol: "₩", source: "KRX" },
  us: { name: "US", route: "#USmatches", file: "data/results-us.json", currency: "USD", symbol: "$", source: "Yahoo Finance" },
};
const state = { kospi: { loading: true }, us: { loading: true } };
const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatUpdated(value) {
  // Older KOSPI files contain local Korean timestamps without an offset.
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+09:00`;
  return new Date(timestamp).toLocaleString(undefined, {
    timeZone: "Asia/Seoul", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }) + " KST";
}

function formatMoney(value, market, isCap = false) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(market.currency === "KRW" ? "ko-KR" : "en-US", {
    style: "currency", currency: market.currency,
    minimumFractionDigits: market.currency === "USD" && !isCap ? 2 : 0,
    maximumFractionDigits: market.currency === "USD" && !isCap ? 2 : 0,
  }).format(value);
}

function formatCap(stock, market) {
  return (stock.marketCapMethod === "estimated" ? "≈ " : "") + formatMoney(stock.marketCap, market, true);
}

function activeMarket() {
  if (window.location.hash === "#USmatches") return "us";
  if (["#KOSPImatches", "#matches"].includes(window.location.hash)) return "kospi";
  return null;
}

function setMessage(message) {
  $("#rows").innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHTML(message)}</td></tr>`;
}

function renderMarket(key) {
  const market = markets[key];
  const other = markets[key === "kospi" ? "us" : "kospi"];
  const { data, error, loading } = state[key];
  $("#matches-title").textContent = `${market.name} Matches.`;
  $("#matches-subtitle").textContent = key === "us"
    ? "Nasdaq-100 or S&P 500 stocks crossing the volume and price thresholds."
    : "Stocks crossing the volume and price thresholds.";
  $("#other-market-link").href = other.route;
  $("#other-market-link").textContent = `${other.name} Matches →`;
  $("#market-cap-heading").textContent = `시가총액 (${market.symbol})`;
  $("#prices-subtitle").textContent = `Daily closing prices (${market.symbol}) over the base and evaluation windows.`;
  $("#matches-source").textContent = `Data provided by ${market.source}. Verify market prices before execution.`;
  $("#matches-updated").textContent = "";
  $("#market-cap-note").textContent = "";
  for (const selector of ["#prices-head", "#prices-body", "#normalized-head", "#normalized-body"]) $(selector).replaceChildren();
  $("#prices-section").style.display = "none";
  $("#normalized-section").style.display = "none";
  $("#match-vol-metric").textContent = `${Number(data?.volumeMultiplier ?? 1.5).toFixed(1)}×`;
  $("#match-price-metric").textContent = `${Number(data?.priceMultiplier ?? 1.1).toFixed(1)}×`;
  document.querySelectorAll("#view-matches [data-window-days]").forEach((element) => {
    element.textContent = data?.windowDays ?? 5;
  });
  if (loading || error) {
    $("#asof").textContent = `${market.name} · ${loading ? "Loading…" : "Unavailable"}`;
    setMessage(loading ? `Loading ${market.name} results…` : `Couldn't load ${market.name} results. Please try again later.`);
    return;
  }
  $("#asof").textContent = `${market.name} · As of ${formatDate(data.asOf)}`;
  $("#matches-updated").textContent = `Updated ${formatUpdated(data.generatedAt)}`;
  if (data.stocks.length === 0) {
    setMessage(`No ${market.name} stocks matched the criteria for ${formatDate(data.asOf)}.`);
    return;
  }
  $("#prices-section").style.display = "flex";
  $("#normalized-section").style.display = "flex";
  let capNote = `Market caps as of ${formatDate(data.asOf)}.`;
  if (data.stocks.some((stock) => stock.marketCapMethod === "estimated")) capNote += " ≈ Estimated from the session close and previously reported shares.";
  if (data.stocks.some((stock) => stock.marketCap == null)) capNote += " — Unavailable for that session.";
  $("#market-cap-note").textContent = capNote;
  $("#rows").innerHTML = data.stocks.map((stock) => `<tr>
    <td class="highlight">${escapeHTML(stock.ticker)}</td>
    <td><strong>${escapeHTML(stock.name)}</strong></td>
    <td class="market-cap">${formatCap(stock, market)}</td>
    <td>${stock.volumeRatio.toFixed(2)}</td><td>${stock.priceRatio.toFixed(2)}</td>
  </tr>`).join("");
  const headers = `<tr><th>Date</th>${data.stocks.map((stock) => `<th>${escapeHTML(stock.name)} (${escapeHTML(stock.ticker)})<span class="stock-market-cap">시가총액 ${formatCap(stock, market)}</span></th>`).join("")}</tr>`;
  $("#prices-head").innerHTML = headers;
  $("#normalized-head").innerHTML = headers;
  const bases = data.stocks.map((stock) => stock.closes.find((value) => value !== null && value !== undefined));
  $("#prices-body").innerHTML = data.dates.map((day, i) => `<tr><td>${escapeHTML(day)}</td>${data.stocks.map((stock) => `<td>${formatMoney(stock.closes[i], market)}</td>`).join("")}</tr>`).join("");
  $("#normalized-body").innerHTML = data.dates.map((day, i) => `<tr><td>${escapeHTML(day)}</td>${data.stocks.map((stock, j) => {
    const value = stock.closes[i];
    return `<td>${value == null || !bases[j] ? "—" : Math.round(value / bases[j] * 100)}</td>`;
  }).join("")}</tr>`).join("");
}

function syncView(scroll = false) {
  const key = activeMarket();
  $("#view-overview").style.display = key ? "none" : "block";
  $("#view-matches").style.display = key ? "block" : "none";
  if (key) renderMarket(key);
  else $("#asof").textContent = "KOSPI & US";
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
    $(`#btn-${key}`).textContent = `${market.name} Matches (${data.stocks.length}) →`;
    $(`#${key}-date`).textContent = `As of ${formatDate(data.asOf)}`;
  } catch (error) {
    console.error(`${market.name} results:`, error);
    state[key] = { error: true, loading: false };
    $(`#${key}-date`).textContent = "Results unavailable";
  }
  // A late response from one market must never overwrite the other view.
  syncView();
}

window.addEventListener("hashchange", () => syncView(true));
syncView();
Promise.allSettled(Object.keys(markets).map(loadMarket));
