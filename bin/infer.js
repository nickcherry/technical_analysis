/******************************************************************************/
/* Imports */
/******************************************************************************/

const chalk = require('chalk');
const moment = require('moment');
const { mongoDatabaseName, mongoUri } = require('../settings').shared;
const { fetcherConfigs, pluginConfigs } = require('../settings').inferring;
const QuantInferrer = require('../lib/QuantInferrer');


/******************************************************************************/
/* Infer */
/******************************************************************************/

const inferrer = new QuantInferrer(mongoUri, mongoDatabaseName, fetcherConfigs, pluginConfigs);

inferrer.on(QuantInferrer.events.PLUGIN_STARTED, (pluginConfig) => {
  console.log(chalk.white(`${ pluginConfig.type } plugin started at ${ moment().format('YYYY-MM-DD HH:mm:ss') }`));
});


inferrer.run();
