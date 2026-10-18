// models/TrackMark.js
// Track & Field marks: one row per event per Track athlete_sports row.
// Table built by scripts/create_track_marks.js (the script owns the shape).
//   event — must match an "events" name in frontend/utils/sports.py
//   mark  — time events in seconds, distance events in inches
//
// Postgres NUMERIC comes back as a string ("10.85"). The getter turns it
// back into a number so routes and Streamlit get 10.85, not "10.85".

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const AthleteSport = require('./AthleteSport');

function asNumber(field) {
  return function () {
    const v = this.getDataValue(field);
    return v === null || v === undefined ? null : Number(v);
  };
}

const TrackMark = sequelize.define('TrackMark', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  athleteSportId: { type: DataTypes.UUID,          allowNull: false },
  event:          { type: DataTypes.STRING,        allowNull: false },
  mark:           { type: DataTypes.DECIMAL(7, 2), allowNull: false, get: asNumber('mark') },
}, {
  tableName: 'track_marks',
  timestamps: true,
});

AthleteSport.hasMany(TrackMark, { foreignKey: 'athleteSportId', as: 'trackMarks' });
TrackMark.belongsTo(AthleteSport, { foreignKey: 'athleteSportId' });

module.exports = TrackMark;