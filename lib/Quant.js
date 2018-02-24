/******************************************************************************/
/* Imports */
/******************************************************************************/

const MongoClient = require('mongodb').MongoClient;


/******************************************************************************/
/* Quant */
/******************************************************************************/

class Quant {
  constructor(mongoUri, mongoDatabaseName, plugins, collectors) {
    this.mongoUri = mongoUri;
    this.mongoDatabaseName = mongoDatabaseName;
    this.plugins = plugins || [];
    this.collectors = collectors || [];
  }

  start() {
    return new Promise((resolve, reject) => {
      // Connect to Mongo, so our plugins can share a database connection
      MongoClient.connect(this.mongoUri, (err, mongoClient) => {
        if (err) return reject(err);
        this.mongoClient = mongoClient;
        const db = mongoClient.db(this.mongoDatabaseName);

        // Start each registered plugin, mapping an array of their returned promises
        const pluginPromises = this.plugins.map((plugin) => {
          return plugin.start(db, this.collectors);
        });

        // Start each of the configured collectors, which will feed data to the plugins
        this.collectors.forEach((collector) => collector.start(db));

        // If/when all the plugins' promises have resolve, we can then resolve this method's promise
        Promise.all(pluginPromises).then(resolve).catch(reject);
      });
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      this.collectors.forEach((collector) => collector.stop());
      this.plugins.forEach((plugin) => plugin.stop());
      if (this.mongoClient) this.mongoClient.close();
    });
  }
}

module.exports = Quant;
