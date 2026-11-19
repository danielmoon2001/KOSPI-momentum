# Crypto and government bonds

`#crypto` contains only Bitcoin (`BTC-USD`) and Ethereum (`ETH-USD`), quoted in
USD per coin. `#bonds` groups the following government-bond ETF proxies by country.
These charts show **unadjusted ETF share prices**, not yields or total returns.

| Country | Maturity exposure | Yahoo symbol | Fund |
| --- | --- | --- | --- |
| Korea | 3 years | `114260.KS` | KODEX 국고채3년 |
| Korea | 10 years | `148070.KS` | KIWOOM 국고채10년 |
| Korea | 30 years | `439870.KS` | KODEX 국고채30년액티브 |
| US | 0–3 months | `SGOV` | iShares 0–3 Month Treasury Bond ETF |
| US | 1–3 years | `SHY` | iShares 1–3 Year Treasury Bond ETF |
| US | 3–7 years | `IEI` | iShares 3–7 Year Treasury Bond ETF |
| US | 7–10 years | `IEF` | iShares 7–10 Year Treasury Bond ETF |
| US | 10–20 years | `TLH` | iShares 10–20 Year Treasury Bond ETF |
| US | 20+ years | `TLT` | iShares 20+ Year Treasury Bond ETF |

Korean funds are quoted in KRW per share; US funds in USD per share. Maturity
labels describe each fund's exposure, not its exact duration or remaining
maturity. ETF distributions can cause price drops and technical signals; cash
income is excluded. Price direction must not be read as yield direction.

## History and snapshot

Yahoo Finance daily `Close` is fetched with automatic adjustment disabled.
The history target is 2,225 calendar days (five years plus 400 days of indicator
warm-up). The Korean 30-year fund began August 23, 2022 and shows only available
history. A 5Y range does not invent earlier prices or guarantee a complete
warm-up for this newer fund. Unavailable indicators display warming-up states.

All pages share the most recent 21:00 Asia/Seoul cutoff. Korean ETF sessions on
that date have closed and are eligible. US ETFs exclude that date's session.
Crypto excludes that date's unfinished UTC bar: 21:00 KST is 12:00 UTC. Its
history includes every calendar day, including weekends. ETFs contain actual
provider sessions; their latest dates can differ across countries and holidays.
Each chart displays its own closing date. Top-level `asOf` is the earliest
latest date across the instruments, not a forced common endpoint.

Presets through 5Y, custom calendar-day counts, exact date ranges, daily tables,
moving averages, prior-close support/resistance and channel breakouts use the
shared chart engine. Percentage filter rules follow [the existing definition](FX-RULES.md).
Settings are independent per section. Indicators use all retained prehistory
before cropping to the selected range. Crypto periods count daily observations;
ETF periods count observed trading sessions. No orders are executed.

## Sources

- [Samsung government-bond ETFs](https://www.samsungfund.com/etf/product/ytm.do)
- [KIWOOM government-bond 10-year ETF](https://www.kiwoometf.com/service/etf/KO02010200M?gcode=148070)
- [iShares US Treasury ETF suite](https://www.ishares.com/us/literature/product-brief/ishares-us-treasury-bond-etfs-product-brief-en-us.pdf)
- [Yahoo Bitcoin history](https://finance.yahoo.com/quote/BTC-USD/history/)
- [Yahoo Ethereum history](https://finance.yahoo.com/quote/ETH-USD/history/)

Provider history can be revised. The dashboard records the snapshot cutoff and
fetch time but does not archive every prior provider revision.
