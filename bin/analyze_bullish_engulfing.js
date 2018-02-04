/******************************************************************************/
/* Imports */
/******************************************************************************/

const argv = require('optimist').argv;
const chalk = require('chalk');
const execSync = require('child_process').execSync;
const fs = require('fs');
const { quantileSeq } = require('mathjs');
const moment = require('moment');
const { basename } = require('path');
const { analysisDir, plotlyUsername, plotlyApiKey, priceHistoryDir, templateDir } = require('../settings');

const plotly = require('plotly')(plotlyUsername, plotlyApiKey);


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

const fetchedData = JSON.parse(fs.readFileSync(priceHistoryFile, 'utf8'));
fetchedData.candles = fetchedData.candles.map((rawCandleData) => {
  return {
    time: rawCandleData[0],
    low: rawCandleData[1],
    high: rawCandleData[2],
    open: rawCandleData[3],
    close: rawCandleData[4],
    volume: rawCandleData[5],
  };
}).sort((a, b) => a.time - b.time);
const { product, candles, candleSize, startTime, endTime } = fetchedData;


/******************************************************************************/
/* Constants / Settings */
/******************************************************************************/

// The number of previous candles that the current candle needs to be larger than
// in order to be considered "engulfing"
const LOOKBEHIND_CANDLES = 5;

// The maximum number of candles to look ahead when determining
// the highs following a bullish engulfing candle
const LOOKAHEAD_CANDLES = 5;

// Path to HTML template that we'll use to present the results
const HTML_TEMPLATE_PATH = `${ templateDir }/analyze_bullish_engulfing.html`;

// Filename and path for analysis results
const OUTPUT_FILENAME = `bullish_engulfing_analysis_${ basename(priceHistoryFilename).replace('.json', '.html') }`;
const OUTPUT_PATH = `${ analysisDir }/${ OUTPUT_FILENAME }`;


/******************************************************************************/
/* Ensure Directory  */
/******************************************************************************/

if (!fs.existsSync(analysisDir)) {
  fs.mkdirSync(analysisDir);
}


/******************************************************************************/
/* Analyze  */
/******************************************************************************/

const unfilteredResults = [];

for (let i = LOOKBEHIND_CANDLES; i < candles.length; i++) {
  const candle = candles[i];

  // Determine the current candle's body height
  const candleHeight = candle.close - candle.open;

  // If it isn't bullish, on to the next
  if (candleHeight <= 0) continue;

  // Collect the recent candles within the LOOKBEHIND_CANDLES range;
  // these will be used to determine the previous trend and whether the current candle is "engulfing"
  const recentCandles = [];
  for (j = 1; j <= LOOKBEHIND_CANDLES; j++) {
    recentCandles.push(candles[i - j]);
  }

  // If the general trend of recent candle isn't bearish, let's move on
  if (recentCandles[recentCandles.length - 1].low <= candle.open) continue;

  // Calculate the maximum height amongst all the recent candles
  const maxRecentCandleHeight = Math.max(...recentCandles.map((candle) => Math.abs(candle.close - candle.open)));

  // If the current candle doesn't engulf all of the recent candles, onto the next
  if (candleHeight <= maxRecentCandleHeight) continue;

  // Calculate the percentage increase between the current candle's height and that of the previous candle
  const pctSizeIncrease = candleHeight / maxRecentCandleHeight - 1;

  // Calculate the maximum and minimum price following the current candle when looking ahead LOOKAHEAD_CANDLES candles
  let lookaheadMaxPrice = -Infinity, lookaheadMinPrice = Infinity;
  for (let j = 1; j <= LOOKAHEAD_CANDLES && i + j < candles.length; j++) {
    lookaheadMaxPrice = Math.max(lookaheadMaxPrice, candles[i + j].high);
    lookaheadMinPrice = Math.min(lookaheadMinPrice, candles[i + j].low);
  }
  const maxPctPriceChange = lookaheadMaxPrice / candle.high - 1;
  const minPctPriceChange = lookaheadMinPrice / candle.high - 1;

  unfilteredResults.push({
    price: candle.close.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
    time: `${ moment.utc(candle.time * 1000).format('YYYY-MM-DD HH:mm') } UTC`,
    pctSizeIncrease,
    maxPctPriceChange,
    minPctPriceChange,
  });
}

// Remove outliers, probably due to wonky API data (see BTC-USD hourly for 2017-04-15), flash crashes, etc.
const [pctSizeIncrease25, pctSizeIncrease75] = quantileSeq(unfilteredResults.map((r) => r.pctSizeIncrease), [0.25, 0.75]);
const pctSizeIncreaseIqr = (pctSizeIncrease75 - pctSizeIncrease25) * 1.5;
const [maxPctPriceChange25, maxPctPriceChange75] = quantileSeq(unfilteredResults.map((r) => r.maxPctPriceChange), [0.25, 0.75]);
const maxPctPriceChangeIqr = (maxPctPriceChange75 - maxPctPriceChange25) * 1.5;
const [minPctPriceChange25, minPctPriceChange75] = quantileSeq(unfilteredResults.map((r) => r.minPctPriceChange), [0.25, 0.75]);
const minPctPriceChangeIqr = (minPctPriceChange75 - minPctPriceChange25) * 1.5;
const results = unfilteredResults.filter((result) => {
  return result.pctSizeIncrease > pctSizeIncrease25 - pctSizeIncreaseIqr &&
    result.pctSizeIncrease < pctSizeIncrease75 + pctSizeIncreaseIqr &&
    result.maxPctPriceChange > maxPctPriceChange25 - maxPctPriceChangeIqr &&
    result.maxPctPriceChange < maxPctPriceChange75 + maxPctPriceChangeIqr &&
    result.minPctPriceChange > minPctPriceChange25 - minPctPriceChangeIqr &&
    result.minPctPriceChange < minPctPriceChange75 + minPctPriceChangeIqr;
});


/******************************************************************************/
/* Generate Chart  */
/******************************************************************************/


const { text, x, y1, y2 } = results.reduce((accumulator, d) => {
  accumulator.text.push(`${ d.price } @ ${ d.time }`),
  accumulator.x.push(d.pctSizeIncrease);
  accumulator.y1.push(d.maxPctPriceChange);
  accumulator.y2.push(d.minPctPriceChange);
  return accumulator;
}, { text: [], x: [], y1: [], y2: [] });

var chartData = [
  { text, x, y: y1, name: 'Highest % Change', mode: 'markers', type: 'scatter', marker: { size: 6, color: '57b888' }, hoverinfo: 'text' },
  { text, x, y: y2, name: 'Lowest % Change', mode: 'markers', type: 'scatter', marker: { size: 6, color: '#E94F5F' }, hoverinfo: 'text' }
];

var chartOpts = {
  filename: OUTPUT_FILENAME,
  layout: {
    showLegend: true,
    margin: { t: 25 },
    xaxis: {
      title: `% Size Increase (Over Largest of Previous ${ LOOKBEHIND_CANDLES } Candles)`,
      tickangle: 33,
      titlefont: { size: 14 },
      tickfont: { size: 10 },
      tickformat: ',.1%',
    },
    yaxis: {
      title: `% Price Change (Over Next ${ LOOKAHEAD_CANDLES } Candles)`,
      tickangle: -15,
      titlefont: { size: 14 },
      tickfont: { size: 10 },
      tickformat: ',.1%',
    },
  },
};
plotly.plot(chartData, chartOpts, (err, msg) => {
  if (err) {
    console.error(chalk.red(`Error generating chart: ${ err.message }`));
    process.exit(1);
  } else {
    writeResults(msg.url);
  }
});


/******************************************************************************/
/* Write Results  */
/******************************************************************************/

const writeResults = (chartUrl) => {
  const analysis = {
    title: `Analysis of Bullish Engulfing Candles During Short-Term Bear Trend`,
    product: product,
    candleSize,
    startTime: moment(startTime).format('MMM Do, YYYY'),
    endTime: moment(endTime).format('MMM Do, YYYY'),
    lookbehindCandles: LOOKBEHIND_CANDLES,
    lookaheadCandles: LOOKAHEAD_CANDLES,
    chartUrl: chartUrl,
    results,
  };

  let html = fs.readFileSync(HTML_TEMPLATE_PATH, 'utf8');
  for (let key in analysis) {
    html = html.replace(new RegExp(`\{${ key }\}`), JSON.stringify(analysis[key]));
  }

  const path = `${ analysisDir }/bullish_engulfing_analysis_${ basename(priceHistoryFilename).replace('.json', '.html') }`;
  fs.writeFileSync(path, html);
  console.log(chalk.green('Data written to', path));
  execSync(`open ${ path }`);
}
