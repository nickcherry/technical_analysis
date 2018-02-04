/******************************************************************************/
/* Imports */
/******************************************************************************/

const argv = require('optimist').argv;
const chalk = require('chalk');
const fs = require('fs');
const moment = require('moment');
const { basename } = require('path');
const { analysisDir, priceHistoryDir } = require('../settings');


/******************************************************************************/
/* Constants / Settings */
/******************************************************************************/

// The maximum number of candles to look ahead when determining
// the highs following a bullish engulfing candle
const LOOKAHEAD_CANDLES = 5;


/******************************************************************************/
/* Read Price History File */
/******************************************************************************/

const priceHistoryFilename = argv['price-history-filename'];
if (!priceHistoryFilename) {
  console.error(chalk.red('The price-history-filename argument cannot be blank.'));
  process.exit(1);
}

const priceHistoryFile = `${ priceHistoryDir }/${ priceHistoryFilename }`;
try {
  fs.statSync(priceHistoryFile);
} catch(e) {
  console.error(chalk.red(`The specified price-history-file (${ priceHistoryFile }) does not exist.`));
  process.exit(1);
}

const candles = JSON.parse(fs.readFileSync(priceHistoryFile, 'utf8')).map((rawCandleData) => {
  return {
    time: rawCandleData[0],
    low: rawCandleData[1],
    high: rawCandleData[2],
    open: rawCandleData[3],
    close: rawCandleData[4],
    volume: rawCandleData[5],
  };
});


/******************************************************************************/
/* Ensure Directory  */
/******************************************************************************/

if (!fs.existsSync(analysisDir)) {
  fs.mkdirSync(analysisDir);
}


/******************************************************************************/
/* Analyze  */
/******************************************************************************/

const results = [];

for (let i = 1; i < candles.length; i++) {
  const candle = candles[i];
  const prevCandle = candles[i - 1];

  // Determine the current candle's body height
  const candleHeight = candle.close - candle.open;

  // If it isn't bullish, on to the next
  if (candleHeight <= 0) continue;

  // Determine the previous candle's body height
  const prevCandleHeight = prevCandle.close - prevCandle.open;

  // If the previous candle isn't bearish or the current candle doesn't engulf its predecessor, onto the next
  if (prevCandleHeight >= 0 || candleHeight <= -prevCandleHeight) continue;

  // Calculate the percentage increase between the current candle's height and that of the previous candle
  const pctSizeIncrease = candleHeight / -prevCandleHeight - 1;

  // Calculate the maximum price following the current candle when looking ahead LOOKAHEAD_CANDLES candles
  let lookaheadHigh = -Infinity;
  for (let j = 1; j <= LOOKAHEAD_CANDLES && i + j < candles.length; j++) {
    lookaheadHigh = Math.max(lookaheadHigh, candles[i + j].high);
  }
  const pctPriceIncrease = lookaheadHigh / candle.high - 1;

  results.push({
    pctSizeIncrease,
    pctPriceIncrease,
  });
}


/******************************************************************************/
/* Write Results  */
/******************************************************************************/

const path = `${ analysisDir }/analysis_${ basename(priceHistoryFilename) }`;
fs.writeFileSync(path, JSON.stringify({
  LOOKAHEAD_CANDLES,
  results,
}));
console.log(chalk.green('Data written to', path));
