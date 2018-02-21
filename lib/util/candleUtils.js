module.exports.normalizeGdaxCandles = (rawCandles) => {
  return rawCandles.map((rawCandleData) => {
    return {
      time: rawCandleData[0],
      low: rawCandleData[1],
      high: rawCandleData[2],
      open: rawCandleData[3],
      close: rawCandleData[4],
      volume: rawCandleData[5],
    };
  }).sort((a, b) => a.time - b.time); // ascending
};
