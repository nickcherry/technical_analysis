/******************************************************************************/
/* Imports */
/******************************************************************************/

const { quantileSeq } = require('mathjs');
const moment = require('moment');
const { roundToInc } = require('../util/number_utils');


/******************************************************************************/
/* Analyze  */
/******************************************************************************/

// The analyze function takes an array of sorted candles and an options object,
// which should have the following properties:
// - lookbehindCandles: The number of previous candles that the current candle needs to be larger than
//   in order to be considered "engulfing"
// - lookaheadCandles: The maximum number of candles to look ahead when determining
//   the highs following a bullish engulfing candle
// - groupSizeForPctPriceIncreaseProbability: The x-axis group size when calculating the probability
//   of the price increasing by a particular percentage
module.exports = (sortedCandles, { lookbehindCandles, lookaheadCandles, groupSizeForPctPriceIncreaseProbability }) => {
  if (!lookbehindCandles) throw new Error('lookbehindCandles must be a positive integer');
  if (!lookaheadCandles) throw new Error('lookaheadCandles must be a positive integer');
  if (!groupSizeForPctPriceIncreaseProbability || groupSizeForPctPriceIncreaseProbability <= 0) {
    throw new Error('groupSizeForPctPriceIncreaseProbability must be a positive number');
  }

  const unfilteredEvents = [];

  for (let i = lookbehindCandles; i < sortedCandles.length; i++) {
    const candle = sortedCandles[i];

    // Collect the recent candles within the lookbehindCandles range;
    // these will be used to determine the previous trend and whether the current candle is "engulfing"
    const recentCandles = [];
    for (j = 1; j <= lookbehindCandles; j++) {
      recentCandles.push(sortedCandles[i - j]);
    }

    // Determine the current candle's body height
    const candleHeight = candle.close - candle.open;

    // Calculate the maximum height amongst all the recent candles
    const maxRecentCandleHeight = Math.max(...recentCandles.map((candle) => Math.abs(candle.close - candle.open)));

    // Determine whether the current candle meets our criteria for "engulfing bullish"
    const isBullishEngulfing = (
      candleHeight > 0 &&                  // Current candle must be bullish
      candleHeight > maxRecentCandleHeight // Current candle must be taller than all recent candles
    );

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

    // Push the data to our unfiltered array of events
    unfilteredEvents.push({
      price: candle.close.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      time: `${ moment.utc(candle.time * 1000).format('YYYY-MM-DD HH:mm') } UTC`,
      pctSizeIncrease,
      maxPctPriceChange,
      minPctPriceChange,
      isBullishEngulfing
    });
  }

  // Remove outliers, probably due to wonky API data (see BTC-USD hourly for 2017-04-15), flash crashes, etc.
  const [pctSizeIncrease25, pctSizeIncrease75] = quantileSeq(unfilteredEvents.map((r) => r.pctSizeIncrease), [0.25, 0.75]);
  const pctSizeIncreaseIqr = (pctSizeIncrease75 - pctSizeIncrease25) * 1.5;

  const [maxPctPriceChange25, maxPctPriceChange75] = quantileSeq(unfilteredEvents.map((r) => r.maxPctPriceChange), [0.25, 0.75]);
  const maxPctPriceChangeIqr = (maxPctPriceChange75 - maxPctPriceChange25) * 1.5;

  const [minPctPriceChange25, minPctPriceChange75] = quantileSeq(unfilteredEvents.map((r) => r.minPctPriceChange), [0.25, 0.75]);
  const minPctPriceChangeIqr = (minPctPriceChange75 - minPctPriceChange25) * 1.5;

  const events = unfilteredEvents.filter((event) => {
    return event.pctSizeIncrease > pctSizeIncrease25 - pctSizeIncreaseIqr &&
      event.pctSizeIncrease < pctSizeIncrease75 + pctSizeIncreaseIqr &&
      event.maxPctPriceChange > maxPctPriceChange25 - maxPctPriceChangeIqr &&
      event.maxPctPriceChange < maxPctPriceChange75 + maxPctPriceChangeIqr &&
      event.minPctPriceChange > minPctPriceChange25 - minPctPriceChangeIqr &&
      event.minPctPriceChange < minPctPriceChange75 + minPctPriceChangeIqr;
  });

  // For both the array of engulfing bullish events and the array of all events (control),
  // we'll need to compute the probability of the price rising by each percentage threshold.
  // Start by determining the min and max percentage price increase we've encountered in our filtered events
  const overallMinPctPriceChange = 0; // roundToInc((Math.min(...events.map((e) => e.minPctPriceChange))), groupSizeForPctPriceIncreaseProbability);
  const overallMaxPctPriceChange = Math.max(...events.map((e) => e.maxPctPriceChange));

  // Next, we'll initialize our probability count objects for both the engulfing bullish candles and our control set (i.e. all candles)
  const probabilityCounts = {}, controlProbabilityCounts = {};

  // And start iterating over the events to count instances where the future price meets or exceeds the percentage thresholds
  for (i = 0; i < events.length; i++) {
    const event = events[i];
    for (j = overallMinPctPriceChange; j <= overallMaxPctPriceChange; j += groupSizeForPctPriceIncreaseProbability) {
      if (event.maxPctPriceChange > j) {
        controlProbabilityCounts[j] = (controlProbabilityCounts[j] || 0) + 1;
        if (event.isBullishEngulfing) {
          probabilityCounts[j] = (probabilityCounts[j] || 0) + 1;
        }
      }
    }
  }

  // Finally, we'll use our counts to compute probabilities for each percentage group
  const probabilities = [], controlProbabilities = [];
  const bullishEngulfingEventCount = events.filter((e) => e.isBullishEngulfing).length;
  for (i = overallMinPctPriceChange; i <= overallMaxPctPriceChange; i += groupSizeForPctPriceIncreaseProbability) {
    const probability = (probabilityCounts[i] || 0) / bullishEngulfingEventCount;
    const controlProbability = (controlProbabilityCounts[i] || 0) / events.length;
    probabilities.push({ pctPriceChange: i, probability });
    controlProbabilities.push({ pctPriceChange: i, probability: controlProbability });
  }

  return {
    events,
    bullishEngulfingEventCount: events.filter((e) => e.isBullishEngulfing).length,
    lookaheadCandles,
    lookbehindCandles,
    probabilities,
    controlProbabilities,
  };
}
