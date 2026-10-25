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

// Track & Field: events, not one position. MUST MATCH the "events" list in
// frontend/utils/sports.py. time = seconds, distance = inches.
// "Relays" is a wishlist choice only, so it has no mark here.
const TRACK = {
  events: {
    '100m':         { kind: 'time',     min: 9.5,   max: 20.0 },
    '200m':         { kind: 'time',     min: 19.0,  max: 40.0 },
    '400m':         { kind: 'time',     min: 43.0,  max: 90.0 },
    '800m':         { kind: 'time',     min: 100.0, max: 240.0 },
    '1600m':        { kind: 'time',     min: 220.0, max: 600.0 },
    '3200m':        { kind: 'time',     min: 480.0, max: 1200.0 },
    '100m Hurdles': { kind: 'time',     min: 12.0,  max: 25.0 },
    '110m Hurdles': { kind: 'time',     min: 12.5,  max: 25.0 },
    '300m Hurdles': { kind: 'time',     min: 34.0,  max: 70.0 },
    '400m Hurdles': { kind: 'time',     min: 46.0,  max: 90.0 },
    '4x100 Split':  { kind: 'time',     min: 9.0,   max: 15.0 },
    '4x400 Split':  { kind: 'time',     min: 42.0,  max: 80.0 },
    '4x800 Split':  { kind: 'time',     min: 100.0, max: 240.0 },
    'Long Jump':    { kind: 'distance', min: 120,   max: 330 },
    'Triple Jump':  { kind: 'distance', min: 240,   max: 660 },
    'High Jump':    { kind: 'distance', min: 36,    max: 96 },
    'Pole Vault':   { kind: 'distance', min: 60,    max: 240 },
    'Shot Put':     { kind: 'distance', min: 120,   max: 840 },
    'Discus':       { kind: 'distance', min: 360,   max: 2640 },
    'Javelin':      { kind: 'distance', min: 360,   max: 3000 },
  },
};

// Softball: positions + fixed stats, same pattern as Football.
// MUST MATCH the Softball entry in frontend/utils/sports.py.
const SOFTBALL = {
  positions: ['Pitcher', 'Catcher', '1B', '2B', '3B', 'SS', 'OF'],
  stats: {
    battingAvg:    { min: 0,   max: 1.0 },
    homeToFirst:   { min: 2.3, max: 5.0 },
    pitchSpeedMph: { min: 30,  max: 80, integer: true },
    era:           { min: 0,   max: 30.0 },
  },
};

// Soccer: positions + fixed stats, same pattern as Softball.
// MUST MATCH the Soccer entry in frontend/utils/sports.py.
// All season totals, so every stat must be a whole number.
const SOCCER = {
  positions: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
  stats: {
    goals:       { min: 0, max: 100, integer: true },
    assists:     { min: 0, max: 100, integer: true },
    saves:       { min: 0, max: 400, integer: true },
    cleanSheets: { min: 0, max: 40,  integer: true },
  },
};

module.exports = { FOOTBALL, TRACK, SOFTBALL, SOCCER };