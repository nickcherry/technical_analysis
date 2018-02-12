/******************************************************************************/
/* Imports */
/******************************************************************************/

const { reduce } = require('async');
const EventEmitter = require('events');


/******************************************************************************/
/* Constants / Settings */
/******************************************************************************/

// https://docs.gdax.com/#get-historic-rates
const GDAX_MAX_DATA_POINTS = 350;
const API_REQUEST_DELAY = 2000; // milliseconds


/******************************************************************************/
/* Fetch Data  */
/******************************************************************************/

class QuantHistoricCandleFetcher extends EventEmitter {
  constructor(gdaxClient) {
    super();
    this.gdaxClient = gdaxClient;
  }

  run(product, startTime, endTime, granularity) {
    return new Promise((resolve, reject) => {
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
      reduce(ranges, [], (candles, range, callback) => {
        const [start, end] = range;
        const opts = { granularity, start, end };
        this.emit(QuantHistoricCandleFetcher.events.FETCH_BATCH_FINISHED, opts);
        this.gdaxClient.getProductHistoricRates(product, { start, end, granularity }, (err, res, data) => {
          setTimeout(() => callback(err, candles.concat(data || [])), API_REQUEST_DELAY);
        });
      }, (err, candles) => {
        this.emit(QuantHistoricCandleFetcher.events.FETCH_FINISHED, err, candles);
        err ? reject(err) : resolve(candles);
      });
    });
  }
}

QuantHistoricCandleFetcher.events = {
  FETCH_BATCH_FINISHED: 'QuantHistoricCandleFetcher.FETCH_BATCH_FINISHED',
  FETCH_FINISHED: 'QuantHistoricCandleFetcher.FETCH_FINISHED',
};

module.exports = QuantHistoricCandleFetcher;
