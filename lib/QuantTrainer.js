/******************************************************************************/
/* Imports */
/******************************************************************************/

const EventEmitter = require('events');
const MongoClient = require('mongodb').MongoClient;
const BullishEngulfingTrainer = require('./plugins/BullishEngulfing/BullishEngulfingTrainer');


/******************************************************************************/
/* Quant Trainer */
/******************************************************************************/

class QuantTrainer extends EventEmitter {
  constructor(mongoUri, mongoDatabaseName, pluginConfigs) {
    super();
    this.mongoUri = mongoUri;
    this.mongoDatabaseName = mongoDatabaseName;
    this.pluginConfigs = pluginConfigs;
    this.plugins = {};
  }

  run() {
    return new Promise((resolve, reject) => {
      MongoClient.connect(this.mongoUri, (err, mongoClient) => {
        if (err) return reject(err);
        const db = mongoClient.db(this.mongoDatabaseName);
        this.emit(QuantTrainer.events.CONNECTED_TO_DATABASE);

        const promises = this.pluginConfigs.map((pluginConfig) => {
          const PluginClass = QuantTrainer.plugins[pluginConfig.type];
          const plugin = new PluginClass(pluginConfig, db);
          this.plugins[pluginConfig.id] = plugin;

          Object.values(PluginClass.events || {}).forEach((eventType) => {
            plugin.on(eventType, (...args) => this.emit(eventType, ...args));
          });

          this.emit(QuantTrainer.events.PLUGIN_STARTED, pluginConfig);
          return plugin.run().then((...args) => {
            this.emit(QuantTrainer.events.PLUGIN_FINISHED, pluginConfig, ...args)
          });
        });

        Promise.all(promises).then((...args) => {
          mongoClient.close();
          resolve(...args);
        }).catch((...args) => {
           mongoClient.close();
          reject(...args);
        });
      });
    });

    getPlugin: (id) => {
      return this.plugins[id];
    }
  }
}

QuantTrainer.events = {
  CONNECTED_TO_DATABASE: ' QuantTrainer.CONNECTED_TO_DATABASE',
  PLUGIN_STARTED: 'QuantTrainer.PLUGIN_STARTED',
  PLUGIN_FINISHED: 'QuantTrainer.PLUGIN_FINISHED',
};

QuantTrainer.plugins = {
  BULLISH_ENGULFING: BullishEngulfingTrainer,
};

module.exports = QuantTrainer;
