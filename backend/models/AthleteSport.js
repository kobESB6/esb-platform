// models/AthleteSport.js
// One row per athlete per sport. Table built by scripts/create_sport_tables.js
// (no sequelize.sync in this project — the script owns the table shape).
//   sport    — must be spelled exactly as in frontend/utils/sports.py SPORTS
//   position — from that sport's registry positions (dropdown, not free text)
//   stats    — game stats nobody filters on yet (JSONB blob)
// Searchable stats live in each sport's own table (football_stats, ...).

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const AthleteSport = sequelize.define('AthleteSport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId:   { type: DataTypes.UUID,   allowNull: false },
  sport:    { type: DataTypes.STRING, allowNull: false },
  position: { type: DataTypes.STRING, allowNull: true },
  stats:    { type: DataTypes.JSONB,  allowNull: false, defaultValue: {} },
}, {
  tableName: 'athlete_sports',
  timestamps: true,
});

User.hasMany(AthleteSport,   { foreignKey: 'userId' });
AthleteSport.belongsTo(User, { foreignKey: 'userId' });

module.exports = AthleteSport;