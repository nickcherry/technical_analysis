/******************************************************************************/
/* Imports */
/******************************************************************************/

const BullishEngulfingTrainer = require('../lib/plugins/BullishEngulfing/BullishEngulfingTrainer');
const chalk = require('chalk');
const moment = require('moment');
const { mongoDatabaseName, mongoUri, priceHistoryDir } = require('../settings');
const Quant = require('../lib/Quant');


/******************************************************************************/
/* Train */
/******************************************************************************/

const product = 'BTC-USD';
const candleSize = '1-day';

const bullishEngulfingTrainer = new BullishEngulfingTrainer({
  id: 'bullishEngulfing',
  dbCollection: 'bullishEngulfing',
  product: product,
  dbCollection: 'bullishEngulfing',
  priceHistoryFile: `${ priceHistoryDir }/${ product }_2016-01-01_2018-02-09_${ candleSize }.json`,
  lookbackCandles: 4,
  lookaheadCandles: 6,
  allowedWickToBodyRatio: 0.2,
  groupSizeForPctPriceIncreaseProbability: 0.0025,
});

const quant = new Quant(mongoUri, mongoDatabaseName, [bullishEngulfingTrainer]);
quant.start().then(() => {
  console.log(chalk.green(`\nTraining completed at ${ moment().format('YYYY-MM-DD HH:mm:ss') }`));
  quant.stop();
}).catch((err) => {
  console.error(chalk.red(err.message));
  process.exit(1);
});
