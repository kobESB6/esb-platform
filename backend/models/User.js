// models/User.js
// ONE model for all three roles (athlete, coach, legend).
// Hybrid design: matchable fields = real columns, full profile bodies = JSONB.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  // ─── IDENTITY (flat columns, present on every user) ───
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,  // Sequelize generates the UUID for us
    primaryKey: true,
  },
  name:  { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },  // bcrypt hash
  role: {
    type: DataTypes.ENUM('athlete', 'coach', 'legend'),
    allowNull: false,
  },
  tier:       { type: DataTypes.STRING, defaultValue: 'basic' },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  profilePhoto: { type: DataTypes.STRING, allowNull: true },

  // ─── PROMOTED MATCHABLE FIELDS (copied up from IDMM for fast search) ───
  primarySport:   { type: DataTypes.STRING, allowNull: true },
  sportsPlayed:   { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  position:       { type: DataTypes.STRING, allowNull: true },
  school:         { type: DataTypes.STRING, allowNull: true },
  graduationYear: { type: DataTypes.INTEGER, allowNull: true },
  gpa:            { type: DataTypes.DECIMAL(3, 2), allowNull: true },
 

  // ─── IDMM BODIES (JSONB — the flexible, evolving profile) ───
  onTheField:     { type: DataTypes.JSONB, defaultValue: {} },
  inTheClassroom: { type: DataTypes.JSONB, defaultValue: {} },
  offTheField:    { type: DataTypes.JSONB, defaultValue: {} },

  // ─── OTHER FLEXIBLE BLOBS ───
  recruiting:     { type: DataTypes.JSONB, defaultValue: {} },
  linkedProfiles: { type: DataTypes.JSONB, defaultValue: [] },
  progression:    { type: DataTypes.JSONB, defaultValue: {} },
  // ─── COACH PREFERENCES (empty for athletes/legends; filled for coaches) ───
  wishlist:       { type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName: 'users',
  timestamps: true,   // auto-manages createdAt + updatedAt
  indexes: [
    { fields: ['role'] },           // fast "get all coaches"
    { fields: ['primarySport'] },   // fast sport filtering
    { fields: ['graduationYear'] }, // fast recruiting-class filtering
    { fields: ['sportsPlayed'], using: 'gin' },   // ← multi-sport search
  ],
});

module.exports = User;