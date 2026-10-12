// models/FootballStats.js
// Football's searchable stats, one row per Football athlete_sports row.
// Column names MUST match the stat "key" values in frontend/utils/sports.py.
//
// Postgres NUMERIC comes back as a string ("4.52"). The getters below turn
// it back into a number so routes and Streamlit get 4.52, not "4.52".

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const AthleteSport = require('./AthleteSport');

function asNumber(field) {
  return function () {
    const v = this.getDataValue(field);
    return v === null || v === undefined ? null : Number(v);
  };
}

const FootballStats = sequelize.define('FootballStats', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  athleteSportId: { type: DataTypes.UUID, allowNull: false, unique: true },
  fortyTime:      { type: DataTypes.DECIMAL(4, 2), allowNull: true, get: asNumber('fortyTime') },
  shuttleTime:    { type: DataTypes.DECIMAL(4, 2), allowNull: true, get: asNumber('shuttleTime') },
  verticalInches: { type: DataTypes.DECIMAL(3, 1), allowNull: true, get: asNumber('verticalInches') },
  benchMaxLbs:    { type: DataTypes.INTEGER,       allowNull: true },
}, {
  tableName: 'football_stats',
  timestamps: true,
});

AthleteSport.hasOne(FootballStats, { foreignKey: 'athleteSportId', as: 'football' });
FootballStats.belongsTo(AthleteSport, { foreignKey: 'athleteSportId' });

module.exports = FootballStats;