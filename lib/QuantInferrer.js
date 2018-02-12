/******************************************************************************/
/* Imports */
/******************************************************************************/

const EventEmitter = require('events');
const MongoClient = require('mongodb').MongoClient;
const BullishEngulfingInferrer = require('./plugins/BullishEngulfing/BullishEngulfingInferrer');


/******************************************************************************/
/* Quant Inferrer */
/******************************************************************************/

class QuantInferrer extends EventEmitter {
  constructor(mongoUri, mongoDatabaseName, pluginConfigs) {
    super();
    this.mongoUri = mongoUri;
    this.mongoDatabaseName = mongoDatabaseName;
    this.pluginConfigs = pluginConfigs;
    this.plugins = [];
  }

  run() {
    MongoClient.connect(this.mongoUri, (err, mongoClient) => {
      if (err) return reject(err);
      const db = mongoClient.db(this.mongoDatabaseName);
      this.emit(QuantInferrer.events.CONNECTED_TO_DATABASE);

      this.pluginConfigs.forEach((pluginConfig) => {
        const PluginClass = QuantInferrer.plugins[pluginConfig.type];
        const plugin = new PluginClass(pluginConfig, db);
        this.plugins[pluginConfig.id] = plugin;

        Object.values(PluginClass.events || {}).forEach((eventType) => {
          plugin.on(eventType, (...args) => this.emit(eventType, ...args));
        });

        this.emit(QuantInferrer.events.PLUGIN_STARTED, pluginConfig);
        plugin.run();
      });
    });
  }

  getPlugin(id) {
    return this.plugins[id];
  }
}

QuantInferrer.events = {
  CONNECTED_TO_DATABASE: ' QuantInferrer.CONNECTED_TO_DATABASE',
  PLUGIN_STARTED: 'QuantInferrer.PLUGIN_STARTED',
};

QuantInferrer.plugins = {
  BULLISH_ENGULFING: BullishEngulfingInferrer,
};

module.exports = QuantInferrer;
