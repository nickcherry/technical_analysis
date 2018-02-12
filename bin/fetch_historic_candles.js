/******************************************************************************/
/* Imports */
/******************************************************************************/

const chalk = require('chalk');
const fs = require('fs');
const gdax = require('gdax');
const moment = require('moment');
const { priceHistoryDir, product, startTime, endTime, candleSize} = require('../settings').fetching.historicCandles;
const QuantHistoricCandleFetcher = require('../lib/QuantHistoricCandleFetcher');


/******************************************************************************/
/* Constants / Settings */
/******************************************************************************/

const CANDLE_SIZE_1_DAY = '1-day';
const CANDLE_SIZE_6_HOUR = '6-hour';
const CANDLE_SIZE_1_HOUR = '1-hour';
const CANDLE_SIZE_15_MINUTE = '15-minute';
const CANDLE_SIZE_5_MINUTE = '5-minute';
const CANDLE_SIZE_1_MINUTE = '1-minute';

const CONFIGS = {
  [CANDLE_SIZE_1_DAY]: { name: '1-day', granularity: 86400 } ,
  [CANDLE_SIZE_6_HOUR]: { name: '6-hour', granularity: 21600 } ,
  [CANDLE_SIZE_1_HOUR]: { name: '1-hour', granularity: 3600 } ,
  [CANDLE_SIZE_15_MINUTE]: { name: '15-minute', granularity: 900 } ,
  [CANDLE_SIZE_5_MINUTE]: { name: '5-minute', granularity: 300 } ,
  [CANDLE_SIZE_1_MINUTE]: { name: '1-minute', granularity: 60 } ,
};


/******************************************************************************/
/* Ensure Directory  */
/******************************************************************************/

if (!fs.existsSync(priceHistoryDir)) {
  fs.mkdirSync(priceHistoryDir);
}


/******************************************************************************/
/* Initialize  */
/******************************************************************************/

const config = CONFIGS[candleSize];
if (!config) {
  throw new Error(`Unrecognized candle size "${ candleSize }". Valid sizes are: ${ Object.keys(CONFIGS).join(', ') }`);
}

const { name, granularity } = config;
const client = new gdax.PublicClient();
const fetcher = new QuantHistoricCandleFetcher(client);

fetcher.on(QuantHistoricCandleFetcher.events.FETCH_BATCH_FINISHED, ({ start, end }) => {
  console.log(chalk.gray('...fetching', moment(start).format('YYYY-MM-DD'), 'through', moment(end).format('YYYY-MM-DD')));
});

fetcher.run(product, startTime, endTime, granularity).then((candles) => {
  const path = `${ priceHistoryDir }/${ product }_${ startTime.format('YYYY-MM-DD') }_${ endTime.format('YYYY-MM-DD') }_${ name }.json`;
  const data = { product: product, candleSize: name, startTime: startTime.valueOf(), endTime: endTime.valueOf(), candles }
  fs.writeFileSync(path, JSON.stringify(data));
  console.log(chalk.green('Data written to', path));
}).catch((err) => {
  console.error(chalk.red(`Error: ${ err }`));
  process.exit(1);
});
