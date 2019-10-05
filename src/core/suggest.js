const leven = require('leven');
const sortBy = require('lodash/sortBy');

const getSuggest = (commands, keyword, threshold = 3) => {
  let ranks = commands.map(x => ({ command: x, distance: leven(keyword, x) }));
  ranks = sortBy(ranks, x => x.distance);
  return ranks.filter(x => x.distance <= threshold);
};

module.exports = getSuggest;
