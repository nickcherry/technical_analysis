/******************************************************************************/
/* Imports */
/******************************************************************************/

const { reduce } = require('async');
const moment = require('moment');


/******************************************************************************/
/* Constants / Settings */
/******************************************************************************/

// https://docs.gdax.com/#get-historic-rates
const GDAX_MAX_DATA_POINTS = 350;
const API_REQUEST_DELAY = 2000; // milliseconds


/******************************************************************************/
/* Fetch Data  */
/******************************************************************************/

module.exports = (gdaxClient, product, startTime, endTime, granularity, onFetchStartCallback, onFinishedCallback) => {
  // Each price history request can support at most GDAX_MAX_DATA_POINTS candles,
  // so the first order of business is breaking our desired historic data range
  // into smaller units that the API can digest.
  const rangeDuration = granularity * GDAX_MAX_DATA_POINTS; // seconds
  const ranges = [];
  let rangeStart = startTime.clone();
  let rangeEnd = startTime.clone().add(rangeDuration - 1, 'seconds');
  while(rangeStart.valueOf() < endTime.valueOf()) {
    ranges.push([rangeStart.toISOString(), rangeEnd.toISOString()]);
    rangeStart.add(rangeDuration, 'seconds');
    rangeEnd.add(rangeDuration, 'seconds');
  }
  // Now that we have our ranges, we can fetch the historic data.
  // We'll do this in series, waiting API_REQUEST_DELAY between each request,
  // as to not violate GDAX's rate limit.
  reduce(ranges, [], (candles, range, rangeCallback) => {
    const [start, end] = range;
    const opts = { granularity, start, end };
    if (onFetchStartCallback) onFetchStartCallback(start, end);
    gdaxClient.getProductHistoricRates(product, { start, end, granularity }, (err, res, data) => {
      setTimeout(() => rangeCallback(err, candles.concat(data)), API_REQUEST_DELAY);
    });
  }, onFinishedCallback);
}
