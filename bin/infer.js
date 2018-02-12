/******************************************************************************/
/* Imports */
/******************************************************************************/

const chalk = require('chalk');
const moment = require('moment');
const { mongoDatabaseName, mongoUri } = require('../settings').shared;
const { pluginConfigs } = require('../settings').training;
const QuantInferrer = require('../lib/QuantInferrer');


/******************************************************************************/
/* Train */
/******************************************************************************/

const inferrer = new QuantInferrer(mongoUri, mongoDatabaseName, pluginConfigs);

inferrer.on(QuantInferrer.events.PLUGIN_STARTED, (pluginConfig) => {
  console.log(chalk.white(`${ pluginConfig.type } plugin started at ${ moment().format('YYYY-MM-DD HH:mm:ss') }`));
});


inferrer.run();
