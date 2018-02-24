/******************************************************************************/
/* Imports */
/******************************************************************************/

const CollectorBase = require('../CollectorBase');
const moment = require('moment');
const OneTimeGDAXCandleCollector = require('./OneTimeGDAXCandleCollector');
const { validateRequiredConfigProps } = require('../../util/validationUtils');


/******************************************************************************/
/* Collect Data  */
/******************************************************************************/

class RealTimeGDAXCandleCollector extends CollectorBase {
  constructor(config) {
    super();
    const granularity = OneTimeGDAXCandleCollector.granularities[config.candleSize];
    if (granularity === undefined) {
      throw new Error(`${ candleSize } is not a recognized candle size. Valid candle sizes include: ${ Object.keys(OneTimeGDAXCandleCollector.granularities).join(', ') }`);
    }
    this.config = Object.assign({ granularity }, config);
    validateRequiredConfigProps(this);
  }

  start() {
    const collect = () => {
      const endTime = moment();
      const rangeDuration = this.config.granularity * OneTimeGDAXCandleCollector.GDAX_MAX_DATA_POINTS; // seconds
      const config = {
        product: this.config.product,
        startTime: endTime.clone().subtract(rangeDuration, 'seconds'),
        endTime,
        candleSize: this.config.candleSize,
      }
      let collector = new OneTimeGDAXCandleCollector(config);
      collector.start().then((rawCandles) => {
        this.emit(RealTimeGDAXCandleCollector.events.COLLECT_FINISHED, rawCandles);
        collector = null;
      });
    };
    collect();
    this.interval = setInterval(collect, this.config.interval);
  }

  stop() {
    clearInterval(this.interval);
  }
}

RealTimeGDAXCandleCollector.requiredConfigProps = [
  'product',
  'candleSize',
  'interval',
];

RealTimeGDAXCandleCollector.events = {
  COLLECT_FINISHED: 'RealTimeGDAXCandleCollector.COLLECT_FINISHED',
};

module.exports = RealTimeGDAXCandleCollector;
