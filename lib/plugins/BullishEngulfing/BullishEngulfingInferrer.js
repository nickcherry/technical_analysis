/******************************************************************************/
/* Imports */
/******************************************************************************/

const EventEmitter = require('events');
const { identityFields } = require('./BullishEngulfingTrainer');
const { pick } = require('lodash');


/******************************************************************************/
/* Inferrer */
/******************************************************************************/

const requiredConfigProps = [
  'product',
  'dbCollection',
  'lookbackCandles',
  'allowedWickToBodyRatio',
];

const validateConfigProps = (config) => {
  requiredConfigProps.forEach((prop) => {
    if (!config[prop]) throw new Error(`The BullishEngulfingInferrer requires a "${ prop }" setting to be configured.`);
  });
}

class BullishEngulfingInferrer extends EventEmitter {
  constructor(config, db) {
    super();
    validateConfigProps(config);
    this.config = config || {};
    this.db = db;
  }

  run() {
    const identity = pick(document, identityFields);
    const collection = this.db.collection(this.config.dbCollection);
    collection.update(identity, document, { upsert: true }, (err) => err ? reject(err) : resolve(document));

  }
}

module.exports = BullishEngulfingInferrer;
