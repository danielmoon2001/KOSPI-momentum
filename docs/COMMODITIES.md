# Commodity futures dashboard

`#commodities` presents nine daily Yahoo Finance futures histories. It is a chart
dashboard, with no equity-style inclusion screen. All nine instruments remain
visible regardless of their technical state. Provider symbols and quote units
are printed on every card.

| Instrument | Yahoo symbol | Stored/displayed quote | Decimal places |
| --- | --- | --- | --- |
| Gold | GC=F | USD / troy oz | 2 |
| Silver | SI=F | USD / troy oz | 3 |
| Copper | HG=F | USD / lb | 4 |
| WTI crude oil | CL=F | USD / barrel | 2 |
| Brent crude oil | BZ=F | USD / barrel | 2 |
| Henry Hub natural gas | NG=F | USD / MMBtu | 3 |
| Chicago SRW wheat | ZW=F | US cents / bushel | 2 |
| Corn | ZC=F | US cents / bushel | 2 |
| Soybeans | ZS=F | US cents / bushel | 2 |

For example, a grain quote of 450 is **450 US cents** per bushel, not $450.
Raw values are never rescaled to dollars or won. Dollar quotes use `$`; grain
quotes use `US¢`. Storage retains up to six decimals; display precision follows
the table. A troy ounce differs from an ordinary ounce; MMBtu is one million Btu.

## History and cutoff

The fetcher requests Yahoo `Close` with daily interval, `auto_adjust=False`, and
exclusive `end` equal to the most recent 21:00 KST snapshot's calendar date.
It independently excludes all observations on/after that date, so the current
US futures session is not included. Provider dates remain session labels; a
close is not asserted to be an official exchange settlement or a Korean close.
Weekends, holidays and missing observations are not filled.

History spans 2,225 calendar days: five years plus 400 days of indicator warm-up.
Every instrument must have at least 1,200 unique ordered finite closes, begin
within seven days of the expected history boundary, and end no more than seven
calendar days behind the eligible end date. Exact metadata and all nine series
are required. A failure rejects the batch and preserves the previous publication.

## Charts and rules

Ranges, moving averages, prior-close channels and percentage filter rules share
the FX implementation described in [FX-RULES.md](FX-RULES.md). Each section owns
its settings; changing Commodities does not change FX. Long and short refer to
the commodity futures price. Settings persist within the current page session.
Calculations use the full stored history before the display range is cropped.

Futures can trade at zero or negative prices. Such closes are preserved in the
chart and linear indicators. Percentage returns touching a nonpositive price
show an em dash, as does a range return containing one. Percentage filter state
shows Unavailable on those rows, then restarts neutral from the next positive
observation. Rolling rules require a fresh positive lookback. No invalid infinite
returns or percentage-based entry signals are manufactured.

## Contract changes and interpretation

These are Yahoo's futures-symbol series, not physical spot prices or a single
unchanging delivery contract. The provider can change the represented contract.
Rolls and provider revisions can create discontinuities and indicator signals.
The dashboard applies no additional roll adjustment, cannot distinguish every
roll jump from a market move, and does not calculate realized strategy returns.
Signals use daily closes and omit execution costs, financing and margin effects.

Source references: [Yahoo commodity symbols](https://finance.yahoo.com/markets/commodities/),
[CME corn units](https://www.cmegroup.com/markets/agriculture/grains/corn/specs),
[CME soybean units](https://www.cmegroup.com/markets/agriculture/oilseeds/soybean/specs),
[CME wheat units](https://www.cmegroup.com/markets/agriculture/grains/wheat/specs),
[CME copper quotation](https://www.cmegroup.com/trading/metals/files/copper-futures-and-options.pdf).
