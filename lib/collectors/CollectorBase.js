/******************************************************************************/
/* Imports */
/******************************************************************************/

const EventEmitter = require('events');


/******************************************************************************/
/* Collector Base */
/******************************************************************************/

class CollectorBase extends EventEmitter {
  start() {
    throw new Error(`${ this.constructor.name } must implement a \`start\` method.`);
  }

  stop() {
    return Promise.resolve();
  }
}

module.exports = CollectorBase;
