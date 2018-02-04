/******************************************************************************/
/* Imports */
/******************************************************************************/

const argv = require('optimist').argv;
const { eachSeries, reduce } = require('async');
const chalk = require('chalk');
const fetch = require('../lib/fetch');
const fs = require('fs');
const gdax = require('gdax');
const moment = require('moment');
const { priceHistoryDir } = require('../settings');


/******************************************************************************/
/* Constants / Settings */
/******************************************************************************/

const PRODUCT = argv.product || 'BTC-USD';
const START_TIME = Object.freeze(moment(argv['start-time'] || new Date(2017, 0, 1).getTime()));
const END_TIME = Object.freeze(moment(argv['end-time']));
const CANDLE_SIZE = argv['candle-size'];

const CANDLE_SIZE_ALL = 'all';
const CANDLE_SIZE_1_DAY = '1-day';
const CANDLE_SIZE_6_HOUR = '6-hour';
const CANDLE_SIZE_1_HOUR = '1-hour';
const CANDLE_SIZE_15_MINUTE = '15-minute';
const CANDLE_SIZE_5_MINUTE = '5-minute';
const CANDLE_SIZE_1_MINUTE = '1-minute';

const CONFIG_1_DAY_CANDLE =  { name: '1-day', granularity: 86400 };
const CONFIG_6_HOUR_CANDLE = { name: '6-hour', granularity: 21600 };
const CONFIG_1_HOUR_CANDLE = { name: '1-hour', granularity: 3600 };
const CONFIG_15_MINUTE_CANDLE = { name: '15-minute', granularity: 900 };
const CONFIG_5_MINUTE_CANDLE = { name: '5-minute', granularity: 300 };
const CONFIG_1_MINUTE_CANDLE = { name: '1-minute', granularity: 60 };


/******************************************************************************/
/* Ensure Directory  */
/******************************************************************************/

if (!fs.existsSync(priceHistoryDir)) {
  fs.mkdirSync(priceHistoryDir);
}


/******************************************************************************/
/* Initialize  */
/******************************************************************************/

const configs = [];

switch(CANDLE_SIZE) {
  case CANDLE_SIZE_1_DAY: configs.push(CONFIG_1_DAY_CANDLE); break;
  case CANDLE_SIZE_6_HOUR: configs.push(CONFIG_6_HOUR_CANDLE); break;
  case CANDLE_SIZE_1_HOUR: configs.push(CONFIG_1_HOUR_CANDLE); break;
  case CANDLE_SIZE_15_MINUTE: configs.push(CONFIG_15_MINUTE_CANDLE); break;
  case CANDLE_SIZE_5_MINUTE: configs.push(CONFIG_5_MINUTE_CANDLE); break;
  case CANDLE_SIZE_1_MINUTE: configs.push(CONFIG_1_MINUTE_CANDLE); break;
  case CANDLE_SIZE_ALL:
    configs.push(
      CONFIG_1_DAY_CANDLE,
      CONFIG_6_HOUR_CANDLE,
      CONFIG_1_HOUR_CANDLE,
      CONFIG_15_MINUTE_CANDLE,
      CONFIG_5_MINUTE_CANDLE,
      CONFIG_1_MINUTE_CANDLE,
    );
    break;
  default:
    const available = [
      CANDLE_SIZE_ALL,
      CANDLE_SIZE_1_DAY,
      CANDLE_SIZE_6_HOUR,
      CANDLE_SIZE_1_HOUR,
      CANDLE_SIZE_15_MINUTE,
      CANDLE_SIZE_5_MINUTE,
      CANDLE_SIZE_1_MINUTE,
    ];
    console.error(chalk.red(`The provided candle-size ("${ CANDLE_SIZE }") is not recognized.`));
    console.error(chalk.red(`Valid arguments include: ${ available.join(', ') } `));
    process.exit(1);
}

const client = new gdax.PublicClient();

eachSeries(configs, ({ granularity, name }, callback) => {
  console.log(chalk.white(`Fetching ${ name } ${ PRODUCT } candles from ${ START_TIME.format('YYYY-MM-DD') } to ${ END_TIME.format('YYYY-MM-DD') }...`));

  const onFetchStartCallback = (start, end) => {
    console.log(chalk.gray('...fetching', moment(start).format('YYYY-MM-DD'), 'through', moment(end).format('YYYY-MM-DD')));
  };

  const onFinishedCallback = (err, candles) => {
    const path = `${ priceHistoryDir }/${ PRODUCT }_${ START_TIME.format('YYYY-MM-DD') }_${ END_TIME.format('YYYY-MM-DD') }_${ name }.json`;
    const data = { product: PRODUCT, candleSize: name, startTime: START_TIME.valueOf(), endTime: END_TIME.valueOf(), candles }
    fs.writeFileSync(path, JSON.stringify(data));
    console.log(chalk.green('Data written to', path));
    callback();
  }

  fetch(client, PRODUCT, START_TIME, END_TIME, granularity, onFetchStartCallback, onFinishedCallback);

}, (err) => {
  err ? console.error(chalk.red(`Error: ${ err.message }`)) : console.log(chalk.green('Finished'))
});
