/******************************************************************************/
/* Imports */
/******************************************************************************/

const dotenv = require('dotenv');
const { get } = require('lodash');


/******************************************************************************/
/* Load Environment Variables */
/******************************************************************************/

const dotenvConfig = dotenv.config(); // Loads from .env by default


/******************************************************************************/
/* Export Constants */
/******************************************************************************/

const env = process.env;


/**************************/
/* Shared Config */
/**************************/

module.exports = {
  mongoDatabaseName: 'technical_analysis',
  mongoUri: 'mongodb://localhost:27017',
  priceHistoryDir: `${ __dirname }/price_history`,
};


/******************************************************************************/
/* Validate Constants */
/******************************************************************************/

const errors = [
  'mongoDatabaseName',
  'mongoUri',
].reduce((errors, key) => {
  if (get(module.exports, key) === undefined) {
    errors.push(`The ${ key } setting / environment variable cannot be blank.`);
  }
  return errors;
}, []);

if (errors.length) {
  errors.forEach((error) => console.error(error));
  process.exit(1);
}
