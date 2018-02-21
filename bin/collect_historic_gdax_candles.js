/******************************************************************************/
/* Imports */
/******************************************************************************/

const chalk = require('chalk');
const fs = require('fs');
const moment = require('moment');
const { priceHistoryDir, product, startTime, endTime, candleSize} = require('../settings').collecting.oneTimeGdaxCandleCollector;
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

const collector = new OneTimeGDAXCandleCollector({ product, startTime, endTime, candleSize });

collector.on(OneTimeGDAXCandleCollector.events.COLLECT_BATCH_FINISHED, ({ start, end }) => {
  console.log(chalk.gray('...collecting', moment(start).format('YYYY-MM-DD'), 'through', moment(end).format('YYYY-MM-DD')));
});

collector.run().then((candles) => {
  const path = `${ priceHistoryDir }/${ product }_${ startTime.format('YYYY-MM-DD') }_${ endTime.format('YYYY-MM-DD') }_${ candleSize }.json`;
  const data = { product: product, candleSize, startTime: startTime.valueOf(), endTime: endTime.valueOf(), candles }
  fs.writeFileSync(path, JSON.stringify(data));
  console.log(chalk.green('Data written to', path));
}).catch((err) => {
  console.error(chalk.red(`Error: ${ err }`));
  process.exit(1);
});
