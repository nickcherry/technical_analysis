/******************************************************************************/
/* Imports */
/******************************************************************************/

const chalk = require('chalk');
const moment = require('moment');
const { mongoDatabaseName, mongoUri } = require('../settings').shared;
const { fetcherConfigs, pluginConfigs } = require('../settings').inferring;
const QuantInferrer = require('../lib/QuantInferrer');
const BullishEngulfingInferrer = require('../lib/plugins/BullishEngulfing/BullishEngulfingInferrer');


/******************************************************************************/
/* Helpers */
/******************************************************************************/

const formatUSD = (val) => val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const formatPercent = (val) => val.toLocaleString('en', { style: 'percent', minimumFractionDigits: 2 });
const formatTime = (val) => moment(val).format('YYYY-MM-DD HH:mm:ss');

/******************************************************************************/
/* Infer */
/******************************************************************************/

const inferrer = new QuantInferrer(mongoUri, mongoDatabaseName, fetcherConfigs, pluginConfigs);

inferrer.on(QuantInferrer.events.PLUGIN_STARTED, (pluginConfig) => {
  console.log(chalk.gray(`${ pluginConfig.type } plugin started at ${ formatTime() }`));
});

inferrer.on(BullishEngulfingInferrer.events.CURRENT_CANDLE_IS_BULLISH_ENGULFING, (pluginConfig, candle, probabilities) => {
  console.log(chalk.green(`CURRENT_CANDLE_IS_BULLISH_ENGULFING at ${ formatTime() }`));
  console.log(chalk.green(`...${ pluginConfig.product }: ${ formatUSD(candle.close) }`));
  probabilities.forEach(({ probability, pctPriceChange }) => {
    if (probability >= 0.8 && pctPriceChange > 0) {
      console.log(chalk.green(`......${ formatPercent(probability) } likelihood of increasing by ${ formatPercent(pctPriceChange) } over the next ${ pluginConfig.lookaheadCandles } candles`))
    }
  });
});

inferrer.run();
