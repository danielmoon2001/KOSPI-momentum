// Subpage router
function syncView() {
  const hash = window.location.hash || "#overview";
  const viewOverview = document.getElementById("view-overview");
  const viewMatches = document.getElementById("view-matches");

  if (hash === "#matches") {
    if (viewOverview) viewOverview.style.display = "none";
    if (viewMatches) viewMatches.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    if (viewMatches) viewMatches.style.display = "none";
    if (viewOverview) viewOverview.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

window.addEventListener("hashchange", syncView);

async function load() {
  try {
    // Cache-buster query ensures fresh results without browser caching issues
    const response = await fetch(`data/results.json?t=${Date.now()}`);
    const data = await response.json();

    const asOfDate = new Date(data.asOf).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    
    // Update As-of date in sub-nav
    document.querySelector("#asof").textContent = `As of ${asOfDate}`;

    // Populate Filter Specifics on Matches Subpage
    const volFormatted = Number(data.volumeMultiplier).toFixed(1);
    const priceFormatted = Number(data.priceMultiplier).toFixed(1);

    const matchVolMetric = document.querySelector("#match-vol-metric");
    const matchVolSub = document.querySelector("#match-vol-sub");
    const matchPriceMetric = document.querySelector("#match-price-metric");
    const matchPriceSub = document.querySelector("#match-price-sub");

    if (matchVolMetric) matchVolMetric.textContent = `${volFormatted}×`;
    if (matchVolSub) matchVolSub.textContent = volFormatted;
    if (matchPriceMetric) matchPriceMetric.textContent = `${priceFormatted}×`;
    if (matchPriceSub) matchPriceSub.textContent = priceFormatted;

    // Update CTA button on Overview
    const stockCount = data.stocks ? data.stocks.length : 0;
    const btnMatches = document.querySelector("#btn-show-matches");
    if (btnMatches) {
      btnMatches.textContent = `View Today's Matches (${stockCount}) →`;
    }

    const summaryTbody = document.querySelector("#rows");
    const pricesHead = document.querySelector("#prices-head");
    const pricesBody = document.querySelector("#prices-body");
    const normHead = document.querySelector("#normalized-head");
    const normBody = document.querySelector("#normalized-body");

    if (!data.stocks || data.stocks.length === 0) {
      summaryTbody.innerHTML =
        '<tr><td colspan="4" style="text-align: center; color: var(--body-muted); padding: 48px 0;">No Pre-Flight Breakouts (PFB) identified today.</td></tr>';
      document.querySelector("#hero-actions").style.display = "block";
      syncView();
      return;
    }

    // Unhide the action button
    document.querySelector("#hero-actions").style.display = "block";

    // Fill Summary Matches Table
    summaryTbody.innerHTML = "";
    data.stocks.forEach((s) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="highlight">${s.ticker}</td>
        <td><strong>${s.name}</strong></td>
        <td>${s.volumeRatio.toFixed(2)}</td>
        <td>${s.priceRatio.toFixed(2)}</td>
      `;
      summaryTbody.appendChild(tr);
    });

    // Build Headers for Prices & Normalized
    const headerRowHTML = `<tr><th>Date</th>${data.stocks
      .map((s) => `<th>${s.name} (${s.ticker})</th>`)
      .join("")}</tr>`;
    pricesHead.innerHTML = headerRowHTML;
    normHead.innerHTML = headerRowHTML;

    // Build Rows for Prices & Base-100 Normalized
    pricesBody.innerHTML = "";
    normBody.innerHTML = "";

    data.dates.forEach((dateStr, i) => {
      const dateDisplay = dateStr.split("T")[0];
      const pTr = document.createElement("tr");
      const nTr = document.createElement("tr");

      let pCells = `<td>${dateDisplay}</td>`;
      let nCells = `<td>${dateDisplay}</td>`;

      data.stocks.forEach((s) => {
        const rawPrice = s.closes[i];

        if (rawPrice === null || rawPrice === undefined) {
          pCells += `<td>-</td>`;
          nCells += `<td>-</td>`;
        } else {
          pCells += `<td>${rawPrice.toLocaleString()}</td>`;

          // Normalize prices (first valid close of base week = 100)
          const basePrice = s.closes.find((p) => p !== null && p !== undefined);
          if (basePrice) {
            const normPrice = Math.round((rawPrice / basePrice) * 100);
            nCells += `<td>${normPrice}</td>`;
          } else {
            nCells += `<td>-</td>`;
          }
        }
      });

      pTr.innerHTML = pCells;
      nTr.innerHTML = nCells;
      pricesBody.appendChild(pTr);
      normBody.appendChild(nTr);
    });

    // Set initial view state based on current URL hash
    syncView();

  } catch (error) {
    console.error(error);
    document.querySelector("#asof").textContent =
      "Couldn't load results. Please run the Python screener first.";
    syncView();
  }
}

load();