# Technical Analysis

This project aims to provide robust and extensible tools for better understanding market behavior and gaining insights on future trends. It has three pillars of focus:

1. Collecting data (historic and real-time) relevant to market behavior (e.g. GDAX candles, tweets, etc.)
2. Training plugins using historic data
3. Inferring future market behavior using live data and knowledge gained through training


## Installing Dependencies

First, ensure that [Mongo](https://www.mongodb.com/), [Node](https://nodejs.org/en/) and [Yarn](https://github.com/yarnpkg/yarn) are installed. Then, run the following from the project's root:

```shell
yarn install
```


## Configuring the Environment

This repository's scripts use [dotenv](https://www.npmjs.com/package/dotenv) to manage environment variables. All variables documented in [`.env.template`](./.env.template) must be defined either in a `.env` file (located at the project root) or configured on the system.

__Note: Currently there are no required environment variables, but if future plugins require API keys, this is where they should live.__

In addition to any environment variables, there are a few required shared settings defined in [`./settings.js`](./settings.js), notably `mongoUri` and `mongoDatabaseName`. The default values are sensible, but should be reviewed.


## Collecting Data Data

Most/all plugins will require historic data for training and real-time data for inference. Listed below are the strategies currently available for collecting data.

### GDAX Candles

#### Historic GDAX Candles

To collect GDAX's historic candle data, first instantiate a new [`OneTimeGDAXCandleCollector`](./lib/collectors/GDAXCandleCollector/OneTimeGDAXCandleCollector.js) with the following configuration:

- __product__:  The trading pair, e.g. `BTC-USD`
- __startTime__: A `Date` object denoting the beginning of the range
- __endtime__: A `Date` object denoting the end of the range
- __candleSize__: The duration of candles to be gathered, supported values are `1-day`, `6-hour`, `1-hour`, `15-minute`, `5-minute`, and `1-minute`.

Next, invoke the `start` method of the collector, and when the candles for the given configuration have been gathered, the returned promise will resolve. Below is a simple example. See [`./bin/collect_historic_gdax_candles.js`](./bin/collect_historic_gdax_candles.js) for more details:

```javascript
const config = { product, startTime, endTime, candleSize };
const collector = new OneTimeGDAXCandleCollector(config);
collector.start().then((candles) => console.log(candles));
```

#### Real-Time GDAX Candles

To collect real-time GDAX candles, first instantiate a new [`RealTimeGDAXCandleCollector`](./lib/collectors/GDAXCandleCollector/RealTimeGDAXCandleCollector.js) with the following configuration:

- __product__:  The trading pair, e.g. `BTC-USD`
- __candleSize__: The duration of candles to be gathered, supported values are `1-day`, `6-hour`, `1-hour`, `15-minute`, `5-minute`, and `1-minute`.
- __interval__: The polling frequency in milliseconds.

In most cases, the collector instance should be passed to a [`Quant`](./lib/Quant.js) instance, which will manage starting and stopping the collector. When new candles have been retrieved, the collector will emit a `RealTimeGDAXCandleCollector.events.COLLECT_FINISHED` event, which can be utilized by concerned plugins. See [`./bin/infer_bullish_engulfing.js`](./bin/infer_bullish\_engulfing.js) for example usage.

### Historic Tweets

_Coming Soon..._


## Training With Historic Data

Once the necessary data has been collected, plugins can begin training with historic data. Listed below are the plugins currently available:

### Available Training Plugins

#### Bullish Engulfing Trainer

The [`BullishEngulfingTrainer`](./lib/plugins/BullishEngulfing/BullishEngulfingTrainer.js) identifies historic instances of bullish engulfing candles and calculates the probability of various percent-price increases in the near-term future. For this exercise, a bullish engulfing candle is defined as having:

1. a higher closing price than opening price
2. a taller candle body than all recent candles
3. a closing price that is at or near its highest price
4. larger volume than all recent candles

The plugin requires the following to be configured:

- __product__: The trading pair to be analyzed, e.g. `BTC-USD`
- __priceHistoryFile__: The absolute path to a historic GDAX candle file generated by the script mentioned in the "Historic GDAX Candles" section
- __dbCollection__: The mongo collection into which the results will be inserted
- __lookbackCandles__: The number of previous candles that the current candle needs to be larger than in order to be considered "engulfing"
- __lookaheadCandles__: The maximum number of candles to look ahead when determining the highs following a bullish engulfing candle
- __allowedWickToBodyRatio__: The maximum body-to-upper-wick ratio that is allowed for a candle to be considered engulfing
- __groupSizeForPctPriceIncreaseProbability__: The grouping size applied when calculating the probability of the price increasing by a particular percentage


#### Twitter Sentiment Trainer

_Coming Soon..._


## Inferring Based On Live Data

Once the necessary training has been completed, plugins can begin inferring with real-time data. Listed below are the plugins currently available:

### Available Inference Plugins

#### Bulllish Engulfing Inferrer

When the current candle meets the criteria defined in the "Bullish Engulfing Trainer" section, the [`BullishEngulfingInferrer`](./lib/plugins/BullishEngulfing/BullishEngulfingInferrer.js) emits a `BullishEngulfingInferrer.CURRENT_CANDLE_IS_BULLISH_ENGULFING` event, which contains the plugin settings, data about the most recent candle, along with probabilities of various percentage-price increases over the next `lookaheadCandles` candles. The plugin requires the following to be configured:

- __product__: The trading pair to be analyzed, e.g. `BTC-USD`
- __dbCollection__: The mongo collection where Bullish Engulfing Training data is stored
- __lookbackCandles__: The number of previous candles that the current candle needs to be larger than in order to be considered "engulfing"
- __lookaheadCandles__: The maximum number of candles to look ahead when determining the highs following a bullish engulfing candle (used to identify the appropriate training data)
- __allowedWickToBodyRatio__: The maximum body-to-upper-wick ratio that is allowed for a candle to be considered engulfing

The [`BullishEngulfingInferrer`](./lib/plugins/BullishEngulfing/BullishEngulfingInferrer.js) also requires a [`RealTimeGDAXCandleCollector`](./lib/collectors/GDAXCandleCollector/RealTimeGDAXCandleCollector.js) for a data feed. See [`./bin/infer_bullish_engulfing.js`](./bin/infer_bullish_engulfing.js) for example usage.

#### Twitter Sentiment Inferrer

_Coming Soon..._


## Registering A New Collector

_Coming Soon..._

## Registering A New Plugin Set

_Coming Soon..._
