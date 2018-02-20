/******************************************************************************/
/* Imports */
/******************************************************************************/

const EventEmitter = require('events');
const { identityFields } = require('./BullishEngulfingTrainer');
const RealTimeGDAXCandleFetcher = require('../../fetchers/GDAXCandleFetcher/RealTimeGDAXCandleFetcher');
const { pick } = require('lodash');
const { normalizeGdaxCandles } = require('../../util/candleUtils');
const { validateRequiredConfigProps } = require('../../util/validationUtils');


/******************************************************************************/
/* Inferrer */
/******************************************************************************/

class BullishEngulfingInferrer extends EventEmitter {
  constructor(config, db, fetchers) {
    super();
    this.config = config;
    this.db = db;
    validateRequiredConfigProps(this);
    this.candleFetcher = fetchers.find((fetcher) => {
      return fetcher.constructor == RealTimeGDAXCandleFetcher && fetcher.config.candleSize === this.config.candleSize;
    });
    if (!this.candleFetcher) throw new Error(`The BullishEngulfingInferrer requires a REAL_TIME_GDAX_CANDLE_FETCHER with a ${ this.config.candleSize } candle size.`)
  }

  run() {
    const identity = pick(this.config, identityFields);
    const collection = this.db.collection(this.config.dbCollection);
    collection.findOne(identity, (err, trainingData) => {
      if (err) throw new Error(`Error fetching BullishEngulfing training data: ${ err.message }`);
      if (!trainingData) throw new Error(`Could not find BullishEngulfing training data with identity: ${ identity }`);
      this.candleFetcher.on(RealTimeGDAXCandleFetcher.events.FETCH_FINISHED, (rawCandles) => {
        const candles = normalizeGdaxCandles(rawCandles);
        console.log(trainingData, candles);
      });
    });
  }
}

BullishEngulfingInferrer.requiredConfigProps = [
  'product',
  'candleSize',
  'dbCollection',
  'lookbackCandles',
  'allowedWickToBodyRatio',
];

BullishEngulfingInferrer.events = [
  ''
];

module.exports = BullishEngulfingInferrer;
