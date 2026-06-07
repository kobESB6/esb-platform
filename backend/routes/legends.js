// routes/legends.js — NOW POSTGRES-BACKED
// Legend = former athlete, completed journey, giving back. No factory — one type.

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');   // ← replaces fs/path/JSON helpers

// Progression engine — role-specific starting rank
function createProgression(role) {
  const startingRank = { athlete: 'Rookie', coach: 'New Coach', legend: 'Alumni' };
  return {
    level: 1,
    xp: 50,
    rank: startingRank?.[role] ?? 'Rookie',   // ← fixed: now uses the lookup
    badges: [{
      name: 'First Step',
      description: 'Welcome to ESB — your journey starts here',
      earnedAt: new Date().toISOString()
    }],
    unlockedFeatures: ['basic_profile', 'browse_directory'],
    milestones: [{ event: 'profile_created', xpAwarded: 50, timestamp: new Date().toISOString() }]
  };
}

// ─── ROUTES ─────────────────────────────────────────────────────

// POST /api/legends/register
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, password, primarySport, sportsPlayed,
      highestLevelPlayed, bio, occupation, mentorshipFocus
    } = req.body;

    if (!name || !email || !password || !primarySport) {
      return res.status(400).json({
        error: 'name, email, password, and primarySport are required'
      });
    }
    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ where: { email: cleanEmail } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const sports = sportsPlayed || [primarySport];   // seed with primary if none given

    const newLegend = await User.create({
      name,
      email: cleanEmail,
      password: hashedPassword,
      role: 'legend',
      tier: 'basic',
      isVerified: false,

      // promoted columns
      primarySport,
      sportsPlayed: sports,

      // JSONB — ON THE FIELD (legend's playing career)
      onTheField: {
        primarySport,
        sportsPlayed: sports,
        highestLevelPlayed: highestLevelPlayed || null,
        careerHistory: [],
        mediaArchive: []
      },

      // JSONB — IN THE CLASSROOM
      inTheClassroom: {
        highSchoolsAttended: [],
        collegesAttended: [],
        academicAchievements: []
      },

      // JSONB — OFF THE FIELD
      offTheField: {
        bio: bio || '',
        occupation: occupation || {
          current: '',
          industry: '',
          company: null,
          yearsInField: '',
          careerPath: '',
          openToNetworking: true
        },
        mentorshipFocus: mentorshipFocus || [],
        communityInvolvement: [],
        socialLinks: { twitter: null, instagram: null, linkedin: null }
      },

      // JSONB — mentorship (legend-specific) stored in recruiting blob
      recruiting: {
        isActiveMentor: true,
        athletesMentored: [],
        legendConnections: [],
        maxMentees: 5,
        mentorshipStyle: ''
      },

      linkedProfiles: [],
      progression: createProgression('legend')
    });

    const { password: _, ...legendWithoutPassword } = newLegend.toJSON();
    res.status(201).json({
      message: 'Legend profile created successfully',
      legend: legendWithoutPassword
    });

  } catch (error) {
    console.error('Legend registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/legends/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase(); 
    const legend = await User.findOne({ where: { email: cleanEmail, role: 'legend' } });
    if (!legend) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, legend.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { password: _, ...legendWithoutPassword } = legend.toJSON();
    res.status(200).json({ message: 'Login successful!', legend: legendWithoutPassword });

  } catch (error) {
    console.error('Legend login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/legends
router.get('/', async (req, res) => {
  try {
    const legends = await User.findAll({
      where: { role: 'legend' },
      attributes: { exclude: ['password'] }
    });
    res.json(legends);
  } catch (error) {
    res.status(500).json({ error: 'Could not retrieve legends' });
  }
});

// GET /api/legends/:id
router.get('/:id', async (req, res) => {
  try {
    const legend = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    if (!legend || legend.role !== 'legend') {
      return res.status(404).json({ error: 'Legend not found' });
    }
    res.json(legend);
  } catch (error) {
    res.status(500).json({ error: 'Could not retrieve legend' });
  }
});

module.exports = router;