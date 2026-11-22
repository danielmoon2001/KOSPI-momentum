# Crypto and government bonds

Crypto shows Bitcoin and Ethereum daily USD closes from Yahoo Finance. Available
history begins September 17, 2014 for BTC and November 9, 2017 for ETH. Every
completed UTC calendar day is retained, including weekends. The snapshot day's
unfinished daily bar is excluded.

Government Bonds begins with [policy rates and benchmark yields](BOND-RATES.md)
for Korea and the US, with observation dates and basis-point changes. Beneath
those values it shows actual **total-return indices**, including reinvested
interest. Values are index points, not ETF prices or yields. A rising index
indicates a positive total return for the represented bond basket. Index levels
have different bases; compare percentage movements, not their absolute levels.

| Country | Maturity | Provider identifier | History begins |
| --- | --- | --- | --- |
| Korea | 3 years | KAP `KAPKTB3Y` | 2015-12-31 |
| Korea | 5 years | KAP `KAPKTB5Y` | 2015-12-31 |
| Korea | 10 years | KAP `KAPKTB10Y` | 2015-12-31 |
| Korea | 30 years | KAP `KAPKTB30Y` | 2016-03-10 |
| US | 0–1 year | Solactive `DE000SLA9S87` | 2006-12-29 |
| US | 1–3 years | Solactive `DE000SLA4B65` | 2006-12-29 |
| US | 3–10 years | Solactive `DE000SLA4B73` | 2006-12-29 |
| US | 10–20 years | Solactive `DE000SLA4B81` | 2006-12-29 |
| US | 20+ years | Solactive `DE000SLA4B99` | 2006-12-29 |

KAP's KTB baskets represent recent Korean Treasury issues at the named original
maturity; they are not exact remaining-maturity bands. The KAP feed's `TotalIndex`
field is used. Solactive's US Treasury maturity bands are total-return indices in
USD. Their pre-launch histories are backtested: the 0–1-year index launched
February 5, 2020; the other four launched October 9, 2017.

## Dates and coverage

All sections use the latest 21:00 Asia/Seoul snapshot. Korean index observations
on that date are eligible; US indices use dates before it. Provider publication
may lag the eligible session. Each card shows its actual last observation date.
No synthetic annual points, interpolation, or ETF fallback is used.

The full configured history is validated for ordered unique finite positive
levels, coverage near its start, and a recent eligible end. Bond gaps longer
than 21 calendar days fail validation. KAP history is retained locally from the
validated published payload and its latest month is refreshed each run; Solactive
history is downloaded in full. Older KAP revisions outside that month require a
full refresh. Provider revisions can affect historical reproducibility.

## Controls

Each chart offers independent ranges through 20Y/MAX, custom day counts and
inclusive dates. Initial range: 1M. All overlays and filter rules start off;
valid settings apply immediately. Enabled indicators use the full history before
cropping. Bond periods count index observations; crypto periods include weekends.
See [technical rules](FX-RULES.md). These signals do not execute orders.

## Sources

- [KAP KTB indices and daily levels](https://www.koreaap.com/kor/index_pe01_02.html)
- [Solactive US Treasury family methodology](https://www.solactive.com/downloads/Guideline-Solactive-US-Treasury-Bond-Index-Family.)
- [Solactive US Treasury 3–10 Year Index](https://www.solactive.com/index/DE000SLA4B73/)
- [Yahoo BTC/USD](https://finance.yahoo.com/quote/BTC-USD/history/)
- [Yahoo ETH/USD](https://finance.yahoo.com/quote/ETH-USD/history/)
