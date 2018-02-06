/******************************************************************************/
/* Imports */
/******************************************************************************/

const analyze = require('../lib/analyze_bullish_engulfing');
const argv = require('optimist').argv;
const chalk = require('chalk');
const execSync = require('child_process').execSync;
const fs = require('fs');
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

// The lookbehind setting determines the number of previous candles that
// the current candle needs to be larger than in order to be considered "engulfing".
// Here we'll define the minimum and maximum values we should attempt
// when trying to optimize the parameter
const MIN_LOOKBEHIND_CANDLES = 1;
const MAX_LOOKBEHIND_CANDLES = 8;

// The lookahead setting determines the maximum number of candles to look ahead
// when determining the highs and lows following a bullish engulfing candle.
// Here we'll define the minimum and maximum values we should attempt
// when trying to optimize the parameter
const MIN_LOOKAHEAD_CANDLES = 1;
const MAX_LOOKAHEAD_CANDLES = 8;

// The allowed wick to body ratio is the maximum allowed percentage of a candle's body height
// that a top wick may be in order for the candle to be classified as a bullish engulfing candle.
// Put another way, this setting determines how small the top wick can be,
// in relation to the candle's body.
const MIN_ALLOWED_WICK_TO_BODY_RATIO = 0;
const MAX_ALLOWED_WICK_TO_BODY_RATIO = 0.2;
const ALLOWED_WICK_TO_BODY_RATIO_INCREMENT = 0.05;

// The x-axis group size when calculating the probability of the price increasing by a particular percentage
const GROUP_SIZE_FOR_PCT_PRICE_INCREASE_PROBABILITY = 0.0025;

// Path to HTML template that we'll use to present the results
const HTML_TEMPLATE_PATH = `${ templateDir }/analyze_bullish_engulfing.html`;

// Filename and path for analysis results
const OUTPUT_FILENAME = `bullish_engulfing_analysis_${ basename(priceHistoryFilename).replace('.json', '.html') }`;
const OUTPUT_PATH = `${ analysisDir }/${ OUTPUT_FILENAME }`;

// Chart Colors
const CHART_GREEN = '#57b888';
const CHART_RED = '#E94F5F';


/******************************************************************************/
/* Ensure Directory  */
/******************************************************************************/

if (!fs.existsSync(analysisDir)) {
  fs.mkdirSync(analysisDir);
}


/******************************************************************************/
/* Analyze  */
/******************************************************************************/

let bestAnalysis, bestProfit;
for (let lookbehindCandles = MIN_LOOKBEHIND_CANDLES; lookbehindCandles <= MAX_LOOKBEHIND_CANDLES; lookbehindCandles++) {
  for (let lookaheadCandles = MIN_LOOKAHEAD_CANDLES; lookaheadCandles <= MAX_LOOKAHEAD_CANDLES; lookaheadCandles++) {
    for (let allowedWickToBodyRatio = MIN_ALLOWED_WICK_TO_BODY_RATIO; allowedWickToBodyRatio <= MAX_ALLOWED_WICK_TO_BODY_RATIO; allowedWickToBodyRatio += ALLOWED_WICK_TO_BODY_RATIO_INCREMENT) {
      const opts = {
        lookbehindCandles,
        lookaheadCandles,
        allowedWickToBodyRatio,
        groupSizeForPctPriceIncreaseProbability: GROUP_SIZE_FOR_PCT_PRICE_INCREASE_PROBABILITY,
      };
      console.log(chalk.gray('\nPerforming bullish engulfing analysis with the following options:\n...', JSON.stringify(opts)));
      const analysis = analyze(candles, opts);
      const profit = analysis.probabilities.reduce((sum, d) => sum + d.probability * d.pctPriceChange, 0) / analysis.probabilities.length;
      if (!bestProfit || bestProfit < profit) {
        bestProfit = profit;
        bestAnalysis = analysis;
      }
    }
  }
}


/******************************************************************************/
/* Generate Probabilities Grouped Bar Chart  */
/******************************************************************************/

const generateProbabilitiesGroupedBarChart = (analysis) => {
  return new Promise((resolve, reject) => {
    const { controlText, controlX, controlY } = analysis.controlProbabilities.reduce((accumulator, data) => {
      accumulator.controlText.push(`${ (data.probability * 100).toFixed(2) }% chance of price increasing by ${ (data.pctPriceChange * 100).toFixed(2) }%`);
      accumulator.controlX.push(data.pctPriceChange);
      accumulator.controlY.push(data.probability);
      return accumulator;
    }, { controlText: [], controlX: [], controlY: [] });

    const { text, x, y } = analysis.probabilities.reduce((accumulator, data) => {
      accumulator.text.push(`${ (data.probability * 100).toFixed(2) }% chance of price increasing by ${ (data.pctPriceChange * 100).toFixed(2) }%`);
      accumulator.x.push(data.pctPriceChange);
      accumulator.y.push(data.probability);
      return accumulator;
    }, { text: [], x: [], y: [] });

    var chartData = [
      {
        name: 'After Any Candle (Control Group)',
        text: controlText,
        x: controlX,
        y: controlY,
        type: 'bar',
        marker: { color: CHART_RED },
        hoverinfo: 'text',
      },
      {
        name: 'After Bullish Engulfing',
        text,
        x,
        y,
        type: 'bar',
        marker: { color: CHART_GREEN },
        hoverinfo: 'text',
      }
    ];

    var chartOpts = {
      filename: OUTPUT_FILENAME,
      layout: {
        showLegend: true,
        margin: { t: 25 },
        xaxis: {
          title: `% Price Increase (Over Closing Price of Candle)`,
          tickangle: 33,
          titlefont: { size: 14 },
          tickfont: { size: 10 },
          tickformat: ',.1%',
        },
        yaxis: {
          title: `Probability of Reaching (Over Next ${ analysis.lookaheadCandles } Candles)`,
          tickangle: -15,
          titlefont: { size: 14 },
          tickfont: { size: 10 },
          tickformat: ',.1%',
        },
      },
    };
    plotly.plot(chartData, chartOpts, (err, msg) => {
      err ? reject(err) : resolve(msg.url);
    });
  });
};


/******************************************************************************/
/* Write Analysis to File  */
/******************************************************************************/

Promise.all([
  generateProbabilitiesGroupedBarChart(bestAnalysis),
]).then(([probabilitiesGroupedBarChartUrl]) => {
  const outputData = Object.assign({
    title: `Analysis of Bullish Engulfing Candles`,
    product: product,
    candleSize,
    startTime: moment(startTime).format('MMM Do, YYYY'),
    endTime: moment(endTime).format('MMM Do, YYYY'),
    probabilitiesGroupedBarChartUrl: probabilitiesGroupedBarChartUrl,
  }, bestAnalysis);

  let html = fs.readFileSync(HTML_TEMPLATE_PATH, 'utf8');
  for (let key in outputData) {
    html = html.replace(new RegExp(`\{${ key }\}`), JSON.stringify(outputData[key]));
  }

  const path = `${ analysisDir }/bullish_engulfing_analysis_${ basename(priceHistoryFilename).replace('.json', '.html') }`;
  fs.writeFileSync(path, html);
  console.log(chalk.green('Data written to', path));
  execSync(`open ${ path }`);
}).catch((err) => {
  console.error(chalk.red('Error generating chart:', err.message));
  process.exit(1);
});
