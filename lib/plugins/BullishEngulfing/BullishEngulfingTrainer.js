/******************************************************************************/
/* Imports */
/******************************************************************************/

const computeProbabilities = require('./computeProbabilities');
const EventEmitter = require('events');
const fs = require('fs');
const { pick } = require('lodash');
const { normalizeGdaxCandles } = require('../../util/candleUtils');


/******************************************************************************/
/* Trainer */
/******************************************************************************/

const requiredConfigProps = [
  'product',
  'priceHistoryFile',
  'dbCollection',
  'lookbackCandles',
  'lookaheadCandles',
  'allowedWickToBodyRatio',
  'groupSizeForPctPriceIncreaseProbability',
];

const validateConfigProps = (config = {}) => {
  requiredConfigProps.forEach((prop) => {
    if (!config[prop]) throw new Error(`The BullishEngulfingTrainer requires a "${ prop }" setting to be configured.`);
  });
}

class BullishEngulfingTrainer extends EventEmitter {
  constructor(config, db) {
    super();
    validateConfigProps(config);
    this.config = config;
    this.db = db;
  }

  run() {
    return new Promise((resolve, reject) => {
      const priceHistoryData = JSON.parse(fs.readFileSync(this.config.priceHistoryFile, 'utf-8'));
      const candles = normalizeGdaxCandles(priceHistoryData.candles);
      const probabilities = computeProbabilities(candles, this.config);

      const document = Object.assign({ product: this.config.product }, probabilities);
      const identity = pick(document, BullishEngulfingTrainer.identityFields);
      const collection = this.db.collection(this.config.dbCollection);
      collection.update(identity, document, { upsert: true }, (err) => err ? reject(err) : resolve(document));
    });
  }
}

BullishEngulfingTrainer.identityFields = ['product', 'lookbackCandles', 'allowedWickToBodyRatio'];

module.exports = BullishEngulfingTrainer;
