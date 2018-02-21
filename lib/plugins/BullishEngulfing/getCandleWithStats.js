/******************************************************************************/
// Get Candle with Stats
//
// Returns the candle at the given index of a sorted array of candles, appending
// useful computed properties like the candle's height, the maximum heighs and volumes
// of recent candles, the wick-to-body ratio, and the percent volume change.
/******************************************************************************/

module.exports = (sortedCandles, i, { lookbackCandles, allowedWickToBodyRatio }) => {
  const candle = Object.assign({}, sortedCandles[i]);

  // Calculate the current candle's body height
  candle.height = candle.close - candle.open;

  // Calculate the maximum height and volume for recent candles within the ${ lookbackCandles } range
  candle.maxRecentCandleHeight = -Infinity
  candle.maxRecentCandleVolume = -Infinity;
  for (let j = 1; j <= lookbackCandles; j++) {
    const recentCandle = sortedCandles[i - j];
    candle.maxRecentCandleHeight = Math.max(candle.maxRecentCandleHeight, Math.abs(recentCandle.close - recentCandle.open));
    candle.maxRecentCandleVolume = Math.max(candle.maxRecentCandleVolume, recentCandle.volume);
  }

  // Calculate the wick-to-body ratio
  candle.candleWickToBodyRatio = Math.abs((candle.high - candle.close) / (candle.open - candle.close));

  // Determine whether the current candle meets our criteria for "bullish engulfing"
  candle.isBullishEngulfing = (
    candle.height > 0 &&                                   // Current candle must be bullish
    candle.height > candle.maxRecentCandleHeight &&        // Current candle must be taller than all recent candles
    candle.volume > candle.maxRecentCandleVolume &&        // Current candle must have greater volume than all recent candles
    candle.candleWickToBodyRatio <= allowedWickToBodyRatio // Current candle must close at or very near to its high
  );

  // Calculate the percentage increase between the current candle's volume and that of the previous candles
  candle.pctVolumeChange = candle.volume / candle.maxRecentCandleVolume - 1;

  return candle;
}
