// config/sportRules.js
// Backend copy of each sport's allowed positions and stat ranges, used to
// check what comes in. MUST MATCH frontend/utils/sports.py SPORT_REGISTRY
// (positions, stat keys, min/max). Same pattern as recruiting statuses.

const FOOTBALL = {
  positions: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K/P'],
  stats: {
    fortyTime:      { min: 3.5, max: 9.0 },
    shuttleTime:    { min: 3.5, max: 8.0 },
    verticalInches: { min: 0,   max: 50 },
    benchMaxLbs:    { min: 0,   max: 500, integer: true },
  },
};

module.exports = { FOOTBALL };