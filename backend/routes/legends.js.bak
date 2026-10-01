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

      // JSONB — mentorship (legend↔athlete)
      mentorship: {
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

// PATCH /api/legends/:id — partial update of a legend profile
router.patch('/:id', async (req, res) => {
  try {
    // 1. Find the legend by primary key (the UUID in the URL).
    const user = await User.findByPk(req.params.id);

    // 2. Guard: must exist AND must actually be a legend row.
    if (!user || user.role !== 'legend') {
      return res.status(404).json({ error: 'Legend not found' });
    }

    // 3. Pull every updatable field. Anything not sent arrives as
    //    `undefined` and gets skipped — that's what makes it a PATCH.
    const {
      // promoted scalar columns:
      name, primarySport, position, school, graduationYear, profilePhoto,
      // array column:
      sportsPlayed, addSport,
      // JSONB blobs:
      onTheField, inTheClassroom, offTheField, mentorship,
    } = req.body;

    // ─── CATEGORY 1: scalar columns ───
    // `!== undefined` not a truthy check, so a deliberate "" still saves.
    // On a legend these mean *attended/played*, not currently enrolled.
    if (name           !== undefined) user.name           = name;
    if (primarySport   !== undefined) user.primarySport   = primarySport;
    if (position       !== undefined) user.position       = position;
    if (school         !== undefined) user.school         = school;
    if (graduationYear !== undefined) user.graduationYear = graduationYear;
    if (profilePhoto   !== undefined) user.profilePhoto   = profilePhoto;

    // ─── CATEGORY 2: array column ───
    // addSport appends one; sportsPlayed replaces the list.
    // Both build a NEW array so Sequelize sees a changed reference.
    if (addSport !== undefined) {
      user.sportsPlayed = [...new Set([...user.sportsPlayed, addSport])];
    } else if (sportsPlayed !== undefined) {
      user.sportsPlayed = sportsPlayed;
    }

    // ─── CATEGORY 3: JSONB blobs — shallow spread-merge ───
    // `{ ...old, ...incoming }` gives a new object reference (Sequelize
    // dirty-tracking) while keeping keys the client didn't send.
    // ⚠️ SHALLOW. `offTheField.occupation` is nested — send it whole.
    if (onTheField !== undefined) {
      user.onTheField = { ...user.onTheField, ...onTheField };
    }
    if (inTheClassroom !== undefined) {
      user.inTheClassroom = { ...user.inTheClassroom, ...inTheClassroom };
    }
    if (offTheField !== undefined) {
      user.offTheField = { ...user.offTheField, ...offTheField };
    }
    // mentorship — the legend↔athlete column (NOT recruiting, that's coach)
    if (mentorship !== undefined) {
      user.mentorship = { ...user.mentorship, ...mentorship };
    }

    // 4. Persist. One UPDATE, only the changed attributes.
    await user.save();

    // 5. Return the updated row, minus the password hash.
    const { password: _omit, ...safeUser } = user.toJSON();
    res.json(safeUser);
  } catch (err) {
    console.error('PATCH /api/legends/:id failed:', err);
    res.status(500).json({ error: 'Failed to update legend' });
  }
});
module.exports = router;