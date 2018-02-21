/******************************************************************************/
/* Imports */
/******************************************************************************/

const EventEmitter = require('events');
const MongoClient = require('mongodb').MongoClient;
const BullishEngulfingInferrer = require('./plugins/BullishEngulfing/BullishEngulfingInferrer');
const RealTimeGDAXCandleCollector = require('./collectors/GDAXCandleCollector/RealTimeGDAXCandleCollector');

/******************************************************************************/
/* Quant Inferrer */
/******************************************************************************/

class QuantInferrer extends EventEmitter {
  constructor(mongoUri, mongoDatabaseName, collectorConfigs, pluginConfigs) {
    super();
    this.mongoUri = mongoUri;
    this.mongoDatabaseName = mongoDatabaseName;
    this.collectorConfigs = collectorConfigs;
    this.pluginConfigs = pluginConfigs;
    this.plugins = [];
    this.collectors = [];
  }

  run() {
    MongoClient.connect(this.mongoUri, (err, mongoClient) => {
      if (err) return reject(err);
      const db = mongoClient.db(this.mongoDatabaseName);
      this.emit(QuantInferrer.events.CONNECTED_TO_DATABASE);

      this.collectorConfigs.forEach((collectorConfig) => {
        const CollectorClass = QuantInferrer.collectors[collectorConfig.type];
        const collector = new CollectorClass(collectorConfig);
        this.collectors.push(collector);
      });

      this.pluginConfigs.forEach((pluginConfig) => {
        const PluginClass = QuantInferrer.plugins[pluginConfig.type];
        const plugin = new PluginClass(pluginConfig, db, this.collectors);
        this.plugins.push(plugin);

        Object.values(PluginClass.events || {}).forEach((eventType) => {
          plugin.on(eventType, (...args) => this.emit(eventType, ...args));
        });

        this.emit(QuantInferrer.events.PLUGIN_STARTED, pluginConfig);
        plugin.run();
      });

      this.collectors.forEach((collector) => collector.run());
    });
  }

  getPlugin(id) {
    return this.plugins[id];
  }
}

QuantInferrer.events = {
  CONNECTED_TO_DATABASE: 'QuantInferrer.CONNECTED_TO_DATABASE',
  PLUGIN_STARTED: 'QuantInferrer.PLUGIN_STARTED',
};

QuantInferrer.collectors = {
  REAL_TIME_GDAX_CANDLE_COLLECTOR: RealTimeGDAXCandleCollector,
};

QuantInferrer.plugins = {
  BULLISH_ENGULFING: BullishEngulfingInferrer,
};

module.exports = QuantInferrer;
