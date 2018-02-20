/******************************************************************************/
/* Imports */
/******************************************************************************/

const chalk = require('chalk');
const fs = require('fs');
const moment = require('moment');
const { priceHistoryDir, product, startTime, endTime, candleSize} = require('../settings').fetching.oneTimeGdaxCandleFetcher;
const OneTimeGDAXCandleFetcher = require('../lib/fetchers/GDAXCandleFetcher/OneTimeGDAXCandleFetcher');


/******************************************************************************/
/* Ensure Directory  */
/******************************************************************************/

if (!fs.existsSync(priceHistoryDir)) {
  fs.mkdirSync(priceHistoryDir);
}


/******************************************************************************/
/* Initialize  */
/******************************************************************************/

const fetcher = new OneTimeGDAXCandleFetcher({ product, startTime, endTime, candleSize });

fetcher.on(OneTimeGDAXCandleFetcher.events.FETCH_BATCH_FINISHED, ({ start, end }) => {
  console.log(chalk.gray('...fetching', moment(start).format('YYYY-MM-DD'), 'through', moment(end).format('YYYY-MM-DD')));
});

fetcher.run().then((candles) => {
  const path = `${ priceHistoryDir }/${ product }_${ startTime.format('YYYY-MM-DD') }_${ endTime.format('YYYY-MM-DD') }_${ candleSize }.json`;
  const data = { product: product, candleSize, startTime: startTime.valueOf(), endTime: endTime.valueOf(), candles }
  fs.writeFileSync(path, JSON.stringify(data));
  console.log(chalk.green('Data written to', path));
}).catch((err) => {
  console.error(chalk.red(`Error: ${ err }`));
  process.exit(1);
});
