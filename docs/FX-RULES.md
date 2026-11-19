# FX chart rules

All signals use daily reference **closes**, expressed as KRW per foreign unit.
Long means long that foreign currency against KRW; short means the opposite.
These are analytical states and signals, not executed positions or profit estimates.
Settings apply to all eight charts and last for the current page session.

Commodities uses the same calculation and chart modules with a separate settings
instance. Its quote units, contract changes and nonpositive-price handling are
described in [COMMODITIES.md](COMMODITIES.md).

Crypto and government-bond ETFs also reuse these calculations with independent
settings. There, Long/Short describes the coin's USD price or ETF's local-currency
share price. Crypto periods include weekends; bond periods count ETF sessions.
See [crypto and bond methodology](CRYPTO-BONDS.md) for cutoffs and price limitations.

## Ranges and timing

The default range is 3M. Presets use 7/14/30/90/180/365/730/1095/1825 calendar-day
lookbacks; 1D uses the latest two observations. Custom days accepts 1–2225 days
back from each pair's latest observation, including both boundary dates when
present. Exact dates include observations on both selected dates. An empty range
is explicitly shown. Weekends and missing dates are never filled.

All indicators calculate from the full stored history before cropping. Selecting
a past end date displays that date's price and state, not the latest snapshot's.
The stored window contains five years plus 400 calendar days of prehistory. At
its earliest edge, incomplete indicators show “Warming up” or an em dash.

## Moving averages

The fast and slow simple moving averages default to 20 and 50 observations.
Each is the arithmetic mean of the most recent n closes, including the current
close. Each period is adjustable from 2 to 250. See the
[Fidelity SMA definition](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/sma).

## Support, resistance and channel breakouts

Support is the minimum and resistance is the maximum of the **previous n** closes,
excluding today's observation. Default n = 20; configurable from 2 to 250.
A close strictly above resistance is an Up breakout; strictly below support is a
Down breakout; equality stays inside. Each outside-channel observation receives
a hollow marker. The levels move with the lookback; they are close-based channels,
not intraday high/low Donchian channels or manually drawn horizontal levels.

## Percentage filter rule

The default x is 1%. This is an adjustable starting setting, not an optimized
threshold. The basic strategy follows the rebound/retracement convention described
in [NYU's filter-rule overview](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/invphillectures/tech.html).

For current close P, reference low L and reference high H:

- Neutral → Long when P ≥ L × (1 + x/100).
- Neutral → Short when P ≤ H × (1 − x/100).
- Long → Short when P ≤ H × (1 − x/100), unless neutral exits are enabled.
- Short → Long when P ≥ L × (1 + x/100), unless neutral exits are enabled.

Smaller moves leave the position unchanged. One observation can cause at most
one state transition. Exact percentage boundaries count as signals; a relative
1e-12 tolerance only protects against binary floating-point rounding.

**Reference extrema:** Running mode starts neutral at the first stored close.
It tracks highs/lows since that initial point or the latest state change, resetting
both to the transition close. Rolling mode instead uses the previous d closes,
excluding today's; d defaults to 20 and accepts 2–250. In rolling mode, if both
entry thresholds trigger while neutral, the rule waits for an unambiguous entry.
Existing positions only evaluate their opposite-direction threshold.

**Holding period:** h counts daily observations after entry. Default h = 0 means
no extra holding constraint. Minimum hold ignores signals until observation i+h
for an entry at i, while still updating extrema. “Exit after h” requires h ≥ 1,
ignores intervening signals and closes to neutral at i+h regardless of direction.
Subsequent entry is evaluated no earlier than the next observation.

**Neutral exit:** Optional y defaults to 0.5% and must satisfy 0 < y < x. A long
exits to neutral at P ≤ H × (1 − y/100); a short exits at P ≥ L × (1 + y/100).
The holding constraint still applies. There is no simultaneous reverse entry,
even when a large move passes x as well as y. Running extrema reset at this exit;
rolling references continue using the previous d closes. Re-entry again needs x.

Triangles mark Long/Short transitions; diamonds mark exits. The card reports
state at the selected end and the date it last changed. The daily table lists
every state and signal, plus the upper/lower thresholds evaluated for that row.
Those thresholds use the incoming state; holding rules can suppress them.

## Interpretation and limits

SMA/channel periods count observations, not calendar days. A signal is known only
after its input close. Changing chart range does not restart the rule; changing
rule parameters recomputes the whole history. New daily downloads use a rolling
history window, so the initial state is not a permanent trading ledger. Provider
revisions may also change historical signals. Reference rates exclude conversion
spreads, fees, execution timing and financing; no strategy return is claimed.

The most recent 21:00 KST snapshot and conservative exclusion of the unfinished
cutoff-day FX bar remain unchanged. See [data semantics](DATA.md#fx-history-datafxjson).
