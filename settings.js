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

module.exports.analysisDir = `${ __dirname }/analysis`;
module.exports.priceHistoryDir = `${ __dirname }/price_history`;
module.exports.templateDir = `${ __dirname }/templates`;

module.exports.plotlyUsername = env.PLOTLY_USERNAME;
module.exports.plotlyApiKey = env.PLOTLY_API_KEY;

/******************************************************************************/
/* Validate Constants */
/******************************************************************************/

const errors = [
  'analysisDir',
  'plotlyUsername',
  'plotlyApiKey',
  'priceHistoryDir',
  'templateDir',
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
