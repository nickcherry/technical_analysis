/******************************************************************************/
/* Imports */
/******************************************************************************/

const getCandleWithStats = require('./getCandleWithStats');
const { identityFields } = require('./BullishEngulfingTrainer');
const PluginBase = require('../PluginBase');
const RealTimeGDAXCandleCollector = require('../../collectors/GDAXCandleCollector/RealTimeGDAXCandleCollector');
const { pick } = require('lodash');
const { normalizeGdaxCandles } = require('../../util/candleUtils');
const { validateRequiredConfigProps } = require('../../util/validationUtils');


/******************************************************************************/
/* Inferrer */
/******************************************************************************/

class BullishEngulfingInferrer extends PluginBase {
  constructor(config) {
    super();
    this.config = config;
    validateRequiredConfigProps(this);
  }

  start(db, collectors) {
    return new Promise((resolve, reject) => {

      // First, verify that the required collector has been provided
      const candleCollector = collectors.find((collector) => {
        return collector.constructor == RealTimeGDAXCandleCollector && collector.config.candleSize === this.config.candleSize;
      });
      if (!candleCollector) reject(new Error(`The BullishEngulfingInferrer requires a REAL_TIME_GDAX_CANDLE_COLLECTOR with a ${ this.config.candleSize } candle size.`));

      // Next verify that the configuration given to the inferrer matches that of training results in the database
      const identity = pick(this.config, identityFields);
      const collection = db.collection(this.config.dbCollection);
      collection.findOne(identity, (err, trainingData) => {
        if (err) reject(new Error(`Error collecting BullishEngulfing training data: ${ err.message }`));
        if (!trainingData) reject(new Error(`Could not find BullishEngulfing training data with identity: ${ identity }`));

        // Assuming the configuration checks out, listen for the GDAX candle collector to fetch a new batch of candles
        candleCollector.on(RealTimeGDAXCandleCollector.events.COLLECT_FINISHED, (rawCandles) => {
          const candles = normalizeGdaxCandles(rawCandles);
          const currentCandle = getCandleWithStats(candles, candles.length - 1, this.config);
          // If the most recent candle is bullish engulfing, fire an event
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
