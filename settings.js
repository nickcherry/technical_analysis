/******************************************************************************/
/* Imports */
/******************************************************************************/

const dotenv = require('dotenv');
const { get } = require('lodash');
const moment = require('moment');


/******************************************************************************/
/* Load Environment Variables */
/******************************************************************************/

const dotenvConfig = dotenv.config(); // Loads from .env by default


/******************************************************************************/
/* Export Constants */
/******************************************************************************/

const env = process.env;


/**************************/
/* Shared Config */
/**************************/

module.exports.shared = {
  mongoDatabaseName: 'technical_analysis',
  mongoUri: 'mongodb://localhost:27017',
};

const priceHistoryDir = `${ __dirname }/price_history`;

const product = 'BTC-USD';
const realTimeGdaxCandleCollectorType = 'REAL_TIME_GDAX_CANDLE_COLLECTOR';
const realTimeGdaxCandleCollectorInterval = 1 * 60 * 1000; // seconds
const realTimeGdaxCandleCollectorLookback = 14 * 24 * 60 * 60 * 1000; // seconds
const realTimeGdaxCandleCollectorCandleSize = '1-day';

const bullishEngulfingId = 'bullishEngulfing';
const bullishEngulfingType = 'BULLISH_ENGULFING';
const bullishEngulfingCollection = 'bullishEngulfing';
const bullishEngulfingLookbackCandles = 4;
const bullishEngulfingLookaheadCandles = 6;
const bullishEngulfingAllowedWickToBodyRatio = 0.2;
const bullishEngulfingCandleSize = '1-day'; // 1-day, 6-hour, 1-hour, 15-minute, 5-minute, or 1-minute


/**************************/
/* Collecting Config */
/**************************/

module.exports.collecting = {
  oneTimeGdaxCandleCollector: {
    product,
    candleSize: bullishEngulfingCandleSize, // 1-day, 6-hour, 1-hour, 15-minute, 5-minute, or 1-minute
    startTime: moment(new Date(2016, 0, 1).getTime()),
    endTime: moment(new Date(2018, 1, 9).getTime()),
    priceHistoryDir,
  },
};

/**************************/
/* Training Config */
/**************************/

module.exports.training = {
  pluginConfigs: [
    {
      id: bullishEngulfingId,
      type: bullishEngulfingType,
      product: product,
      dbCollection: bullishEngulfingCollection,
      priceHistoryFile: `${ priceHistoryDir }/${ product }_2016-01-01_2018-02-09_${ bullishEngulfingCandleSize }.json`,
      lookbackCandles: bullishEngulfingLookbackCandles,
      allowedWickToBodyRatio: bullishEngulfingAllowedWickToBodyRatio,
      lookaheadCandles: bullishEngulfingLookaheadCandles,
      groupSizeForPctPriceIncreaseProbability: 0.0025,
    },
  ],
};

/**************************/
/* Inferring Config */
/**************************/

module.exports.inferring = {
  collectorConfigs: [
    {
      type: realTimeGdaxCandleCollectorType,
      product,
      candleSize: realTimeGdaxCandleCollectorCandleSize,
      lookback: realTimeGdaxCandleCollectorLookback,
      interval: realTimeGdaxCandleCollectorInterval,
    }
  ],
  pluginConfigs: [
    {
      id: bullishEngulfingId,
      product,
      candleSize: bullishEngulfingCandleSize,
      type: bullishEngulfingType,
      dbCollection: bullishEngulfingCollection,
      lookbackCandles: bullishEngulfingLookbackCandles,
      lookaheadCandles: bullishEngulfingLookaheadCandles,
      allowedWickToBodyRatio: bullishEngulfingAllowedWickToBodyRatio,
    },
  ],
};


/******************************************************************************/
/* Validate Constants */
/******************************************************************************/

const errors = [
  'collecting.oneTimeGdaxCandleCollector.candleSize',
  'collecting.oneTimeGdaxCandleCollector.endTime',
  'collecting.oneTimeGdaxCandleCollector.product',
  'collecting.oneTimeGdaxCandleCollector.startTime',
  'collecting.oneTimeGdaxCandleCollector.priceHistoryDir',

  'inferring.collectorConfigs',
  'inferring.pluginConfigs',

  'shared.mongoDatabaseName',
  'shared.mongoUri',

  'training.pluginConfigs',
].reduce((errors, key) => {
  if (get(module.exports, key) === undefined) {
    errors.push(`The ${ key } setting / environment variable cannot be blank.`);
  }
  return errors;
}, []);

if (errors.length) {
  errors.forEach((error) => console.error(error));
  process.exit(1);
}
