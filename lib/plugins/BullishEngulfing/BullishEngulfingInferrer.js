/******************************************************************************/
/* Imports */
/******************************************************************************/

const EventEmitter = require('events');
const getCandleWithStats = require('./getCandleWithStats');
const { identityFields } = require('./BullishEngulfingTrainer');
const RealTimeGDAXCandleCollector = require('../../collectors/GDAXCandleCollector/RealTimeGDAXCandleCollector');
const { pick } = require('lodash');
const { normalizeGdaxCandles } = require('../../util/candleUtils');
const { validateRequiredConfigProps } = require('../../util/validationUtils');


/******************************************************************************/
/* Inferrer */
/******************************************************************************/

class BullishEngulfingInferrer extends EventEmitter {
  constructor(config, db, collectors) {
    super();
    this.config = config;
    this.db = db;
    validateRequiredConfigProps(this);
    this.candleCollector = collectors.find((collector) => {
      return collector.constructor == RealTimeGDAXCandleCollector && collector.config.candleSize === this.config.candleSize;
    });
    if (!this.candleCollector) throw new Error(`The BullishEngulfingInferrer requires a REAL_TIME_GDAX_CANDLE_COLLECTOR with a ${ this.config.candleSize } candle size.`)
  }

  run() {
    const identity = pick(this.config, identityFields);
    const collection = this.db.collection(this.config.dbCollection);
    collection.findOne(identity, (err, trainingData) => {
      if (err) throw new Error(`Error collecting BullishEngulfing training data: ${ err.message }`);
      if (!trainingData) throw new Error(`Could not find BullishEngulfing training data with identity: ${ identity }`);
      this.candleCollector.on(RealTimeGDAXCandleCollector.events.COLLECT_FINISHED, (rawCandles) => {
        const candles = normalizeGdaxCandles(rawCandles);
        const currentCandle = getCandleWithStats(candles, candles.length - 1, this.config);
        if (currentCandle.isBullishEngulfing) {
          this.emit(
            BullishEngulfingInferrer.events.CURRENT_CANDLE_IS_BULLISH_ENGULFING,
            this.config,
            currentCandle,
            trainingData.probabilities
          );
        }
      });
    });
  }
}

BullishEngulfingInferrer.requiredConfigProps = [
  'product',
  'candleSize',
  'dbCollection',
  'lookbackCandles',
  'lookaheadCandles',
  'allowedWickToBodyRatio',
];

BullishEngulfingInferrer.events = {
  CURRENT_CANDLE_IS_BULLISH_ENGULFING: 'BullishEngulfingInferrer.CURRENT_CANDLE_IS_BULLISH_ENGULFING',
};

module.exports = BullishEngulfingInferrer;
