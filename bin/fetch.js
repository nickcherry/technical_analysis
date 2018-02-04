/******************************************************************************/
/* Imports */
/******************************************************************************/

const argv = require('optimist').argv;
const { eachSeries, reduce } = require('async');
const chalk = require('chalk');
const fs = require('fs');
const gdax = require('gdax');
const moment = require('moment');
const { priceHistoryDir } = require('../settings');


/******************************************************************************/
/* Constants / Settings */
/******************************************************************************/

const PRODUCT = argv.product || 'BTC-USD';
const START_TIME = Object.freeze(moment(argv['start-time'] || new Date(2016, 0, 1).getTime()));
const END_TIME = Object.freeze(moment(argv['end-time']));
const CANDLE_SIZE = argv['candle-size'];

const CANDLE_SIZE_ALL = 'all';
const CANDLE_SIZE_1_DAY = '1-day';
const CANDLE_SIZE_6_HOUR = '6-hour';
const CANDLE_SIZE_1_HOUR = '1-hour';
const CANDLE_SIZE_15_MINUTE = '15-minute';
const CANDLE_SIZE_5_MINUTE = '5-minute';
const CANDLE_SIZE_1_MINUTE = '1-minute';

// https://docs.gdax.com/#get-historic-rates
const GDAX_MAX_DATA_POINTS = 350;
const API_REQUEST_DELAY = 2000; // milliseconds

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
/* Fetch Data  */
/******************************************************************************/

const client = new gdax.PublicClient();

const fetch = (granularity, callback) => {
  // Each price history request can support at most GDAX_MAX_DATA_POINTS candles,
  // so the first order of business is breaking our desired historic data range
  // into smaller units that the API can digest.
  const rangeDuration = granularity * GDAX_MAX_DATA_POINTS; // seconds
  const ranges = [];
  let rangeStart = START_TIME.clone();
  let rangeEnd = START_TIME.clone().add(rangeDuration - 1, 'seconds');
  while(rangeStart.valueOf() < END_TIME.valueOf()) {
    ranges.push([rangeStart.toISOString(), rangeEnd.toISOString()]);
    rangeStart.add(rangeDuration, 'seconds');
    rangeEnd.add(rangeDuration, 'seconds');
  }
  // Now that we have our ranges, we can fetch the historic data.
  // We'll do this in series, waiting API_REQUEST_DELAY between each request,
  // as to not violate GDAX's rate limit.
  reduce(ranges, [], (candles, range, rangeCallback) => {
    const [start, end] = range;
    const opts = { granularity, start, end };
    console.log(chalk.gray('...fetching', moment(start).format('YYYY-MM-DD'), 'through', moment(end).format('YYYY-MM-DD')));
    client.getProductHistoricRates(PRODUCT, { start, end, granularity }, (err, res, data) => {
      setTimeout(() => rangeCallback(err, candles.concat(data)), API_REQUEST_DELAY);
    });
  }, callback);
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

eachSeries(configs, ({ granularity, name }, callback) => {
  console.log(chalk.white(`Fetching ${ name } ${ PRODUCT } candles from ${ START_TIME.format('YYYY-MM-DD') } to ${ END_TIME.format('YYYY-MM-DD') }...`));
  fetch(granularity, (err, candles) => {
    const path = `${ priceHistoryDir }/${ PRODUCT }_${ START_TIME.format('YYYY-MM-DD') }_${ END_TIME.format('YYYY-MM-DD') }_${ name }.json`;
    fs.writeFileSync(path, JSON.stringify(candles));
    console.log(chalk.green('Data written to', path));
    callback();
  });
}, (err) => {
  err ? console.error(chalk.red(`Error: ${ err.message }`)) : console.log(chalk.green('Finished'))
});
