# Technical Analysis

## Installing Dependencies

After installing [Node](https://nodejs.org/en/) and [Yarn](https://github.com/yarnpkg/yarn), run the following from the project's root:

```shell
yarn install
```


## Configuring the Environment

This repository's scripts use [dotenv](https://www.npmjs.com/package/dotenv) to manage environment variables. All variables documented in [`.env.template`](./.env.template) must be defined either in a `.env` file (located at the project root) or configured on the system. Notably, a `PLOTLY_USERNAME` and `PLOTLY_API_KEY` must be defined for rendering analysis charts using [Plotly](https://plot.ly/).


## Fetching Historic Candle Data

To fetch GDAX's historic USD-BTC candle data (since the beginning of January, 2017), run one of the following from the project root:

```shell
yarn run fetch-1-minute-price-history
yarn run fetch-5-minute-price-history
yarn run fetch-15-minute-price-history
yarn run fetch-1-hour-price-history
yarn run fetch-6-hour-price-history
yarn run fetch-1-day-price-history

# OR fetch history for all of the above-mentioned candle sizes with:
yarn run fetch-price-history
```

The product (e.g. USD-BTC) and start/end time can be overridden with the `--product`, `--start-time`, and `--end-time` arguments. By default, price history data will be stored in the [./price_history](./price_history) directory (configurable in [./settings.js](./settings.js).


## Analyzing Historic Candle Data

### Bullish Engulfing

To analyze instances of bullish engulfing candles, run the `analyze-bullish-engulfing` script. It expects a `price-history-filename` argument, which is the name of a JSON file (generated using the `fetch` script) that lives within the [./price_history](./price_history) directory. For example:

```shell
yarn run analyze-bullish-engulfing --price-history-filename BTC-USD_2017-01-01_2018-02-03_1-hour.json
```
