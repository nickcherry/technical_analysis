/******************************************************************************/
/* Imports */
/******************************************************************************/

const computeProbabilities = require('./computeProbabilities');
const EventEmitter = require('events');
const fs = require('fs');
const { pick } = require('lodash');
const { normalizeGdaxCandles } = require('../../util/candleUtils');
const { validateRequiredConfigProps } = require('../../util/validationUtils');


/******************************************************************************/
/* Trainer */
/******************************************************************************/

class BullishEngulfingTrainer extends EventEmitter {
  constructor(config, db) {
    super();
    this.config = config;
    this.db = db;
    validateRequiredConfigProps(this);
  }

  run() {
    return new Promise((resolve, reject) => {
      const priceHistoryData = JSON.parse(fs.readFileSync(this.config.priceHistoryFile, 'utf-8'));
      const candles = normalizeGdaxCandles(priceHistoryData.candles);
      const probabilities = computeProbabilities(candles, this.config);

      const document = Object.assign({
        product: this.config.product,
        candleSize: priceHistoryData.candleSize,
      }, probabilities);
      const identity = pick(document, BullishEngulfingTrainer.identityFields);
      const collection = this.db.collection(this.config.dbCollection);
      collection.update(identity, document, { upsert: true }, (err) => err ? reject(err) : resolve(document));
    });
  }
}

BullishEngulfingTrainer.requiredConfigProps = [
  'product',
  'priceHistoryFile',
  'dbCollection',
  'lookbackCandles',
  'lookaheadCandles',
  'allowedWickToBodyRatio',
  'groupSizeForPctPriceIncreaseProbability',
];

BullishEngulfingTrainer.identityFields = [
  'product',
  'candleSize',
  'lookbackCandles',
  'allowedWickToBodyRatio',
];

module.exports = BullishEngulfingTrainer;
