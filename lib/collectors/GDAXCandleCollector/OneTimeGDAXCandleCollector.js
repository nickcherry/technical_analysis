/******************************************************************************/
/* Imports */
/******************************************************************************/

const { reduce } = require('async');
const CollectorBase = require('../CollectorBase');
const gdax = require('gdax');
const { validateRequiredConfigProps } = require('../../util/validationUtils');


/******************************************************************************/
/* Collect Data  */
/******************************************************************************/

class OneTimeGDAXCandleCollector extends CollectorBase {
  constructor(config) {
    super();
    const granularity = OneTimeGDAXCandleCollector.granularities[config.candleSize];
    if (granularity === undefined) {
      throw new Error(`${ candleSize } is not a recognized candle size. Valid candle sizes include: ${ Object.keys(OneTimeGDAXCandleCollector.granularities).join(', ') }`);
    }
    this.config = Object.assign({ granularity }, config);
    this.client = new gdax.PublicClient();
    validateRequiredConfigProps(this);
  }

  start() {
    return new Promise((resolve, reject) => {
      // Each price history request can support at most GDAX_MAX_DATA_POINTS candles,
      // so the first order of business is breaking our desired historic data range
      // into smaller units that the API can digest.
      const rangeDuration = this.config.granularity * OneTimeGDAXCandleCollector.GDAX_MAX_DATA_POINTS; // seconds
      const ranges = [];
      let rangeStart = moment(this.config.startTime).clone();
      let rangeEnd = moment(this.config.startTime).clone().add(rangeDuration - 1, 'seconds');
      while(rangeStart.valueOf() < this.config.endTime.valueOf()) {
        ranges.push([rangeStart.toISOString(), rangeEnd.toISOString()]);
        rangeStart.add(rangeDuration, 'seconds');
        rangeEnd.add(rangeDuration, 'seconds');
      }
      // Now that we have our ranges, we can collect the historic data.
      // We'll do this in series, waiting API_REQUEST_DELAY between each request,
      // as to not violate GDAX's rate limit.
      reduce(ranges, [], (candles, range, callback) => {
        const [start, end] = range;
        const opts = { granularity: this.config.granularity, start, end };
        this.client.getProductHistoricRates(this.config.product, opts, (err, res, data) => {
          setTimeout(() => callback(err, candles.concat(data || [])), OneTimeGDAXCandleCollector.API_REQUEST_DELAY);
        });
      }, (err, candles) => {
        this.emit(OneTimeGDAXCandleCollector.events.COLLECT_FINISHED, err, candles);
        err ? reject(err) : resolve(candles);
      });
    });
  }
}

OneTimeGDAXCandleCollector.requiredConfigProps = [
  'product',
  'startTime',
  'endTime',
  'candleSize',
];

OneTimeGDAXCandleCollector.events = {
  COLLECT_FINISHED: 'OneTimeGDAXCandleCollector.COLLECT_FINISHED',
};

OneTimeGDAXCandleCollector.candleSizes = {
  CANDLE_SIZE_1_DAY: '1-day',
  CANDLE_SIZE_6_HOUR: '6-hour',
  CANDLE_SIZE_1_HOUR: '1-hour',
  CANDLE_SIZE_15_MINUTE: '15-minute',
  CANDLE_SIZE_5_MINUTE: '5-minute',
  CANDLE_SIZE_1_MINUTE: '1-minute',
};

OneTimeGDAXCandleCollector.granularities = {
  '1-day': 86400,
  '6-hour': 21600,
  '1-hour': 3600,
  '15-minute': 900,
  '5-minute': 300,
  '1-minute': 60,
};

// https://docs.gdax.com/#get-historic-rates
OneTimeGDAXCandleCollector.GDAX_MAX_DATA_POINTS = 350;
OneTimeGDAXCandleCollector.API_REQUEST_DELAY = 2000; // milliseconds

module.exports = OneTimeGDAXCandleCollector;
