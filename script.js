// Route configuration and independently loaded market state.
const markets = {
  kospi: { name: "KOSPI", route: "#KOSPImatches", file: "data/results.json", currency: "KRW", symbol: "₩", source: "KRX" },
  us: { name: "US", route: "#USmatches", file: "data/results-us.json", currency: "USD", symbol: "$", source: "Yahoo Finance" },
};
const state = { kospi: { loading: true }, us: { loading: true } };
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
    minimumFractionDigits: market.currency === "USD" ? 2 : 0,
    maximumFractionDigits: market.currency === "USD" ? 2 : 0,
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
    maximumFractionDigits: 2,
  }).format(value / divisor);
  return `${stock.marketCapMethod === "estimated" ? "≈ " : ""}${market.symbol}${amount}${unit}`;
}

// Both market routes share one set of tables; clear them before each render.
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
    : "KOSPI 200 stocks crossing the volume and price thresholds.";
  $("#other-market-link").href = other.route;
  $("#other-market-link").textContent = `${other.name} Matches →`;
  $("#market-cap-heading").textContent = "Market cap";
  $("#prices-subtitle").textContent = `Daily closing prices (${market.symbol}) over the base and evaluation windows.`;
  $("#matches-source").textContent = `${market.source}. Verify prices before trading.`;
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
  $("#asof").textContent = `Updated ${formatUpdated(data.generatedAt, true)}`;
  const snapshotNote = !data.snapshotAt ? "" : data.snapshotAt.slice(0, 10) === data.asOf
    ? " · 9 PM KST snapshot" : ` · Snapshot: ${formatSnapshot(data.snapshotAt)}`;
  $("#matches-updated").textContent = `Prices & caps: ${formatDate(data.asOf)}${snapshotNote}.`;
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

// Route updates and asynchronous loads always render the currently selected market.
function syncView(scroll = false) {
  const key = activeMarket();
  $("#view-overview").style.display = key ? "none" : "block";
  $("#view-matches").style.display = key ? "block" : "none";
  if (key) renderMarket(key);
  else {
    const latest = Object.values(state).map((entry) => entry.data?.generatedAt).filter(Boolean).sort().at(-1);
    $("#asof").textContent = latest ? `Updated ${formatUpdated(latest, true)}`
      : Object.values(state).some((entry) => entry.loading) ? "Loading…" : "Update unavailable";
  }
  const snapshots = Object.values(state).map((entry) => entry.data?.snapshotAt);
  $("#snapshot-status").textContent = snapshots.every(Boolean) && snapshots[0] === snapshots[1]
    ? `Snapshot: ${formatSnapshot(snapshots[0])}. Completed sessions only.`
    : "Daily 9 PM KST snapshots; see each market for its cutoff.";
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
