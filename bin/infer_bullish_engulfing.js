/******************************************************************************/
/* Imports */
/******************************************************************************/

const BullishEngulfingInferrer = require('../lib/plugins/BullishEngulfing/BullishEngulfingInferrer');
const chalk = require('chalk');
const RealTimeGDAXCandleCollector = require('../lib/collectors/GDAXCandleCollector/RealTimeGDAXCandleCollector');
const moment = require('moment');
const { mongoDatabaseName, mongoUri } = require('../settings');
const Quant = require('../lib/Quant');


/******************************************************************************/
/* Helpers */
/******************************************************************************/

const formatUSD = (val) => val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const formatPercent = (val) => val.toLocaleString('en', { style: 'percent', minimumFractionDigits: 2 });
const formatTime = (val) => moment(val).format('YYYY-MM-DD HH:mm:ss');


/******************************************************************************/
/* Infer */
/******************************************************************************/

const product = 'BTC-USD';
const candleSize = '1-day';

const bullishEngulfingInferrer = new BullishEngulfingInferrer({
  product,
  candleSize,
  dbCollection: 'bullishEngulfing',
  lookbackCandles: 4,
  lookaheadCandles: 6,
  allowedWickToBodyRatio: 0.2,
});

const realTimeGDAXCandleCollector = new RealTimeGDAXCandleCollector({
  product,
  candleSize,
  interval: 15 * 60 * 1000, // seconds
  lookback: 14 * 24 * 60 * 60 * 1000, // seconds
});

const quant = new Quant(mongoUri, mongoDatabaseName, [bullishEngulfingInferrer], [realTimeGDAXCandleCollector]);

bullishEngulfingInferrer.on(BullishEngulfingInferrer.events.CURRENT_CANDLE_IS_BULLISH_ENGULFING, (pluginConfig, candle, probabilities) => {
  console.log(chalk.green(`CURRENT_CANDLE_IS_BULLISH_ENGULFING at ${ formatTime() }`));
  console.log(chalk.green(`...${ pluginConfig.product }: ${ formatUSD(candle.close) }`));
  probabilities.forEach(({ probability, pctPriceChange }) => {
    if (probability >= 0.8 && pctPriceChange > 0) {
      console.log(chalk.green(`......${ formatPercent(probability) } likelihood of increasing by ${ formatPercent(pctPriceChange) } over the next ${ pluginConfig.lookaheadCandles } candles`))
    }
  });
});

quant.start();
