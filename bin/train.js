/******************************************************************************/
/* Imports */
/******************************************************************************/

const chalk = require('chalk');
const moment = require('moment');
const { mongoDatabaseName, mongoUri, priceHistoryDir } = require('../settings').shared;
const { pluginConfigs } = require('../settings').training;
const QuantTrainer = require('../lib/QuantTrainer');


/******************************************************************************/
/* Train */
/******************************************************************************/

const trainer = new QuantTrainer(mongoUri, mongoDatabaseName, pluginConfigs);

trainer.on(QuantTrainer.events.PLUGIN_STARTED, (pluginConfig) => {
  console.log(chalk.white(`Training started for ${ pluginConfig.type } plugin at ${ moment().format('YYYY-MM-DD HH:mm:ss') }`));
});

trainer.on(QuantTrainer.events.PLUGIN_FINISHED, (pluginConfig, _result) => {
  console.log(chalk.white(`Training finished for ${ pluginConfig.type } plugin at ${ moment().format('YYYY-MM-DD HH:mm:ss') }`));
});

trainer.run().then(() => {
  console.log(chalk.green(`\nTraining completed at ${ moment().format('YYYY-MM-DD HH:mm:ss') }`));
}).catch((err) => {
  console.error(chalk.red(err.message));
  process.exit(1);
});
