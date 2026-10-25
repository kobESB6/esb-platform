// models/SoccerStats.js
// Soccer's searchable stats, one row per Soccer athlete_sports row.
// Column names MUST match the stat "key" values in frontend/utils/sports.py.
//
// All four stats are whole numbers (INTEGER), so Postgres returns real numbers.
// No asNumber getters needed, unlike Softball's NUMERIC columns.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const AthleteSport = require('./AthleteSport');

const SoccerStats = sequelize.define('SoccerStats', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  athleteSportId: { type: DataTypes.UUID, allowNull: false, unique: true },
  goals:          { type: DataTypes.INTEGER, allowNull: true },
  assists:        { type: DataTypes.INTEGER, allowNull: true },
  saves:          { type: DataTypes.INTEGER, allowNull: true },
  cleanSheets:    { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'soccer_stats',
  timestamps: true,
});

AthleteSport.hasOne(SoccerStats, { foreignKey: 'athleteSportId', as: 'soccer' });
SoccerStats.belongsTo(AthleteSport, { foreignKey: 'athleteSportId' });

module.exports = SoccerStats;