/******************************************************************************/
/* Imports */
/******************************************************************************/

const dotenv = require('dotenv');


/******************************************************************************/
/* Load Environment Variables */
/******************************************************************************/

const dotenvConfig = dotenv.config(); // Loads from .env by default


/******************************************************************************/
/* Export Constants */
/******************************************************************************/

const env = process.env;

module.exports.defaultProduct = 'BTC-USD';
module.exports.priceHistoryDir = `${ __dirname }/price_history`;
module.exports.defaultPriceHistoryStartDate = new Date(2016, 0, 1).getTime();

/******************************************************************************/
/* Validate Constants */
/******************************************************************************/

const errors = [
  'defaultProduct',
  'priceHistoryDir',
  'defaultPriceHistoryStartDate',
].reduce((errors, key) => {
  if (module.exports[key] === undefined) {
    errors.push(`The ${ key } setting / environment variable cannot be blank.`);
  }
  return errors;
}, []);

if (errors.length) {
  errors.forEach((error) => console.error(error));
  process.exit(1);
}
