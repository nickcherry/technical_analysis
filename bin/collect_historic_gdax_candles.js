/******************************************************************************/
/* Imports */
/******************************************************************************/

const chalk = require('chalk');
const fs = require('fs');
const moment = require('moment');
const { priceHistoryDir } = require('../settings');
const OneTimeGDAXCandleCollector = require('../lib/collectors/GDAXCandleCollector/OneTimeGDAXCandleCollector');


/******************************************************************************/
/* Ensure Directory  */
/******************************************************************************/

if (!fs.existsSync(priceHistoryDir)) {
  fs.mkdirSync(priceHistoryDir);
}


/******************************************************************************/
/* Initialize  */
/******************************************************************************/

const product = 'BTC-USD';
const startTime = moment(new Date(2016, 0, 1).getTime());
const endTime = moment(new Date(2018, 1, 9).getTime());
const candleSize = '1-day';

const collector = new OneTimeGDAXCandleCollector({ product, startTime, endTime, candleSize });

collector.on(OneTimeGDAXCandleCollector.events.COLLECT_BATCH_FINISHED, ({ start, end }) => {
  console.log(chalk.gray('...collecting', moment(start).format('YYYY-MM-DD'), 'through', moment(end).format('YYYY-MM-DD')));
});

collector.start().then((candles) => {
  const path = `${ priceHistoryDir }/${ product }_${ startTime.format('YYYY-MM-DD') }_${ endTime.format('YYYY-MM-DD') }_${ candleSize }.json`;
  const data = { product: product, candleSize, startTime: startTime.valueOf(), endTime: endTime.valueOf(), candles }
  fs.writeFileSync(path, JSON.stringify(data));
  console.log(chalk.green('Data written to', path));
}).catch((err) => {
  console.error(chalk.red(`Error: ${ err }`));
  process.exit(1);
});
