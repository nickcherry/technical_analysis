/******************************************************************************/
/* Imports */
/******************************************************************************/

const EventEmitter = require('events');


/******************************************************************************/
/* Collector Base */
/******************************************************************************/

class PluginBase extends EventEmitter {
  start(_db, _collectors) {
    throw new Error(`${ this.constructor.name } must implement a \`start\` method.`);
  }

  stop() {
    return Promise.resolve();
  }
}

module.exports = PluginBase;
