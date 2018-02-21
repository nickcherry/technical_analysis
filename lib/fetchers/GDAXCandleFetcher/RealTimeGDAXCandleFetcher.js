/******************************************************************************/
/* Imports */
/******************************************************************************/

const EventEmitter = require('events');
const moment = require('moment');
const OneTimeGDAXCandleFetcher = require('./OneTimeGDAXCandleFetcher');
const { validateRequiredConfigProps } = require('../../util/validationUtils');


/******************************************************************************/
/* Fetch Data  */
/******************************************************************************/

class RealTimeGDAXCandleFetcher extends EventEmitter {
  constructor(config) {
    super();
    const granularity = OneTimeGDAXCandleFetcher.granularities[config.candleSize];
    if (granularity === undefined) {
      throw new Error(`${ candleSize } is not a recognized candle size. Valid candle sizes include: ${ Object.keys(OneTimeGDAXCandleFetcher.granularities).join(', ') }`);
    }
    this.config = Object.assign({ granularity }, config);
    validateRequiredConfigProps(this);
  }

  run() {
    const fetch = () => {
      const endTime = moment();
      const rangeDuration = this.config.granularity * OneTimeGDAXCandleFetcher.GDAX_MAX_DATA_POINTS; // seconds
      const config = {
        product: this.config.product,
        startTime: endTime.clone().subtract(rangeDuration, 'seconds'),
        endTime,
        candleSize: this.config.candleSize,
      }
      let fetcher = new OneTimeGDAXCandleFetcher(config);
      fetcher.run().then((rawCandles) => {
        this.emit(RealTimeGDAXCandleFetcher.events.FETCH_FINISHED, rawCandles);
        fetcher = null;
      });
    };
    fetch();
    return setInterval(fetch, this.config.interval);
  }
}

RealTimeGDAXCandleFetcher.requiredConfigProps = [
  'product',
  'candleSize',
  'interval',
];

RealTimeGDAXCandleFetcher.events = {
  FETCH_BATCH_FINISHED: 'RealTimeGDAXCandleFetcher.FETCH_BATCH_FINISHED',
  FETCH_FINISHED: 'RealTimeGDAXCandleFetcher.FETCH_FINISHED',
};

module.exports = RealTimeGDAXCandleFetcher;
