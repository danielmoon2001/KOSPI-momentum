// Close-based indicators. Every result uses only the current or earlier observations.
const fxDefaults = Object.freeze({ fast: 20, slow: 50, channel: 20, x: 1, y: 0.5,
  mode: "running", lookback: 20, hold: 0, holdMode: "minimum", neutral: false, averages: true, bands: true, filter: true });

function fxSettingsError(settings) {
  for (const key of ["fast", "slow", "channel", "lookback"]) {
    if (!Number.isInteger(settings[key]) || settings[key] < 2 || settings[key] > 250)
      return "Indicator periods must be whole numbers from 2 to 250 observations.";
  }
  if (!Number.isInteger(settings.hold) || settings.hold < 0 || settings.hold > 250)
    return "Minimum hold must be a whole number from 0 to 250 observations.";
  if (!["minimum", "fixed"].includes(settings.holdMode) || (settings.holdMode === "fixed" && settings.hold === 0))
    return "A fixed holding period requires at least one observation.";
  if (!Number.isFinite(settings.x) || settings.x < 0.01 || settings.x > 50)
    return "Entry/reversal x must be between 0.01% and 50%.";
  if (settings.neutral && (!Number.isFinite(settings.y) || settings.y < 0.01 || settings.y >= settings.x))
    return "Neutral exit y must be at least 0.01% and smaller than x.";
  if (!["running", "rolling"].includes(settings.mode)) return "Choose a supported extrema method.";
  return "";
}

function fxAnalyze(history, settings = fxDefaults) {
  const error = fxSettingsError(settings);
  if (error) throw new Error(error);
  let sum = 0, state = "Neutral", entered = null, since = null;
  let high = history[0]?.close, low = high;
  const prefix = [0];
  const average = (period, index) => index + 1 < period ? null : (prefix[index + 1] - prefix[index + 1 - period]) / period;
  return history.map((point, index) => {
    sum += point.close;
    prefix.push(sum);
    const previous = history.slice(Math.max(0, index - settings.channel), index);
    const support = previous.length === settings.channel ? Math.min(...previous.map(p => p.close)) : null;
    const resistance = previous.length === settings.channel ? Math.max(...previous.map(p => p.close)) : null;
    const breakout = resistance !== null && point.close > resistance ? "Up" : support !== null && point.close < support ? "Down" : "Inside";
    let signal = "", upper = null, lower = null;
    let ready = index > 0;
    if (settings.mode === "rolling") {
      const reference = history.slice(Math.max(0, index - settings.lookback), index);
      ready = reference.length === settings.lookback;
      if (ready) {
        high = Math.max(...reference.map(p => p.close));
        low = Math.min(...reference.map(p => p.close));
      }
    }
    if (ready) {
      const exit = settings.neutral ? settings.y : settings.x;
      upper = low * (1 + (state === "Short" ? exit : settings.x) / 100);
      lower = high * (1 - (state === "Long" ? exit : settings.x) / 100);
      // Tolerance only accommodates binary rounding at an exact percentage boundary.
      const up = point.close >= upper - Math.abs(upper) * 1e-12;
      const down = point.close <= lower + Math.abs(lower) * 1e-12;
      const unlocked = entered === null || index - entered >= settings.hold;
      let next = state;
      if (unlocked) {
        if (state !== "Neutral" && settings.holdMode === "fixed") next = "Neutral";
        else if (state === "Long" && down) next = settings.neutral ? "Neutral" : "Short";
        else if (state === "Short" && up) next = settings.neutral ? "Neutral" : "Long";
        // A wide rolling channel can trigger both directions. Wait for an unambiguous entry.
        else if (state === "Neutral" && up !== down) next = up ? "Long" : "Short";
      }
      if (next !== state) {
        signal = next === "Neutral" ? `Exit ${state.toLowerCase()}` : next;
        state = next;
        entered = next === "Neutral" ? null : index;
        since = point.date;
        high = low = point.close;
      }
    }
    high = Math.max(high, point.close);
    low = Math.min(low, point.close);
    return {...point, fast: average(settings.fast, index), slow: average(settings.slow, index),
      support, resistance, breakout: support === null ? "Warming up" : breakout,
      state: ready ? state : "Warming up", since, signal, upper, lower,
      change: index ? (point.close / history[index - 1].close - 1) * 100 : null};
  });
}
