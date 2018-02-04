/******************************************************************************/
/* Imports */
/******************************************************************************/

const { quantileSeq } = require('mathjs');
const moment = require('moment');


/******************************************************************************/
/* Analyze  */
/******************************************************************************/

module.exports = (sortedCandles, lookbehindCandles, lookaheadCandles) => {
  const unfilteredResults = [];

  for (let i = lookbehindCandles; i < sortedCandles.length; i++) {
    const candle = sortedCandles[i];

    // Determine the current candle's body height
    const candleHeight = candle.close - candle.open;

    // If it isn't bullish, on to the next
    if (candleHeight <= 0) continue;

    // Collect the recent candles within the lookbehindCandles range;
    // these will be used to determine the previous trend and whether the current candle is "engulfing"
    const recentCandles = [];
    for (j = 1; j <= lookbehindCandles; j++) {
      recentCandles.push(sortedCandles[i - j]);
    }

    // If the general trend of recent candle isn't bearish, let's move on
    if (recentCandles[recentCandles.length - 1].low <= candle.open) continue;

    // Calculate the maximum height amongst all the recent candles
    const maxRecentCandleHeight = Math.max(...recentCandles.map((candle) => Math.abs(candle.close - candle.open)));

    // If the current candle doesn't engulf all of the recent candles, onto the next
    if (candleHeight <= maxRecentCandleHeight) continue;

    // Calculate the percentage increase between the current candle's height and that of the previous candle
    const pctSizeIncrease = candleHeight / maxRecentCandleHeight - 1;

    // Calculate the maximum and minimum price following the current candle when looking ahead ${ lookaheadCandles } candles
    let lookaheadMaxPrice = -Infinity, lookaheadMinPrice = Infinity;
    for (let j = 1; j <= lookaheadCandles && i + j < sortedCandles.length; j++) {
      lookaheadMaxPrice = Math.max(lookaheadMaxPrice, sortedCandles[i + j].high);
      lookaheadMinPrice = Math.min(lookaheadMinPrice, sortedCandles[i + j].low);
    }
    const maxPctPriceChange = lookaheadMaxPrice / candle.high - 1;
    const minPctPriceChange = lookaheadMinPrice / candle.high - 1;

    // Push the data to our unfiltered array of results
    unfilteredResults.push({
      price: candle.close.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      time: `${ moment.utc(candle.time * 1000).format('YYYY-MM-DD HH:mm') } UTC`,
      pctSizeIncrease,
      maxPctPriceChange,
      minPctPriceChange,
    });
  }

  // Remove outliers, probably due to wonky API data (see BTC-USD hourly for 2017-04-15), flash crashes, etc.
  const [pctSizeIncrease25, pctSizeIncrease75] = quantileSeq(unfilteredResults.map((r) => r.pctSizeIncrease), [0.25, 0.75]);
  const pctSizeIncreaseIqr = (pctSizeIncrease75 - pctSizeIncrease25) * 1.5;

  const [maxPctPriceChange25, maxPctPriceChange75] = quantileSeq(unfilteredResults.map((r) => r.maxPctPriceChange), [0.25, 0.75]);
  const maxPctPriceChangeIqr = (maxPctPriceChange75 - maxPctPriceChange25) * 1.5;

  const [minPctPriceChange25, minPctPriceChange75] = quantileSeq(unfilteredResults.map((r) => r.minPctPriceChange), [0.25, 0.75]);
  const minPctPriceChangeIqr = (minPctPriceChange75 - minPctPriceChange25) * 1.5;

  return unfilteredResults.filter((result) => {
    return result.pctSizeIncrease > pctSizeIncrease25 - pctSizeIncreaseIqr &&
      result.pctSizeIncrease < pctSizeIncrease75 + pctSizeIncreaseIqr &&
      result.maxPctPriceChange > maxPctPriceChange25 - maxPctPriceChangeIqr &&
      result.maxPctPriceChange < maxPctPriceChange75 + maxPctPriceChangeIqr &&
      result.minPctPriceChange > minPctPriceChange25 - minPctPriceChangeIqr &&
      result.minPctPriceChange < minPctPriceChange75 + minPctPriceChangeIqr;
  });
}
