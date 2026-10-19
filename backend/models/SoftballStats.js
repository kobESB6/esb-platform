// models/SoftballStats.js
// Softball's searchable stats, one row per Softball athlete_sports row.
// Column names MUST match the stat "key" values in frontend/utils/sports.py.
//
// Postgres NUMERIC comes back as a string ("0.345"). The getters below turn
// it back into a number so routes and Streamlit get 0.345, not "0.345".

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const AthleteSport = require('./AthleteSport');

function asNumber(field) {
  return function () {
    const v = this.getDataValue(field);
    return v === null || v === undefined ? null : Number(v);
  };
}

const SoftballStats = sequelize.define('SoftballStats', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  athleteSportId: { type: DataTypes.UUID, allowNull: false, unique: true },
  battingAvg:     { type: DataTypes.DECIMAL(4, 3), allowNull: true, get: asNumber('battingAvg') },
  homeToFirst:    { type: DataTypes.DECIMAL(4, 2), allowNull: true, get: asNumber('homeToFirst') },
  pitchSpeedMph:  { type: DataTypes.INTEGER,       allowNull: true },
  era:            { type: DataTypes.DECIMAL(4, 2), allowNull: true, get: asNumber('era') },
}, {
  tableName: 'softball_stats',
  timestamps: true,
});

AthleteSport.hasOne(SoftballStats, { foreignKey: 'athleteSportId', as: 'softball' });
SoftballStats.belongsTo(AthleteSport, { foreignKey: 'athleteSportId' });

module.exports = SoftballStats;