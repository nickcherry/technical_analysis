# Technical Analysis

## Installing Dependencies

After installing [Node](https://nodejs.org/en/) and [Yarn](https://github.com/yarnpkg/yarn), run the following from the project's root:

```shell
yarn install
```

## Fetching Historic Candle Data

To fetch GDAX's historic USD-BTC candle data (since the beginning of January, 2016), run one of the following from the project root:

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

The default product and start/end time can be configured in [./settings.js](./settings.js) or explicitly overridden with the `--product`, `--start-time`, and `--end-time` arguments. By default, price history data will be stored in the [./price_history](./price_history) directory.
