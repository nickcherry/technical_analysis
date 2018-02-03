# Technical Analysis

## Installing Dependencies

After installing [Node](https://nodejs.org/en/) and [Yarn](https://github.com/yarnpkg/yarn), run the following from the project's root:

```shell
yarn install
```

## Fetch Price History

To fetch GDAX's USD-BTC price history data since the beginning of January, 2016, run one of the following from the project root:

```shell
yarn run fetch-1-minute-price-history
yarn run fetch-5-minute-price-history
yarn run fetch-15-minute-price-history
yarn run fetch-1-hour-price-history
yarn run fetch-6-hour-price-history
yarn run fetch-1-day-price-history
yarn run fetch-price-history # Fetches history for all of the above-mentioned candle sizes
```

The default product and start/end time can be configurable in [./settings.js](./settings.js) or explicitly overridden with the `--product`, `--start-time`, and `--end-time` arguments. By default, price history data will be stored in the [./price_history](./price_history) directory.
