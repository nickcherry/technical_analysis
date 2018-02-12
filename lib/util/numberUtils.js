module.exports.roundToInc = (num, inc) => {
  const diff = num % inc;
  return diff > inc / 2 ? (num - diff + inc) : num - diff;
}
