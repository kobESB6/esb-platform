// routes/coaches.js
// Coach API endpoints — NOW POSTGRES-BACKED
// OOP hierarchy + factory PRESERVED — they build the object, Sequelize stores it

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');   // replaces fs/path/JSON helpers

// Progression engine — unchanged
function createProgression(role) {
  const startingRank = { athlete: 'Rookie', coach: 'New Coach', legend: 'Alumni' };
  return {
    level: 1,
    xp: 50,
    rank: startingRank?.[role] ?? 'Rookie',
    badges: [{
      id: uuidv4(),
      name: 'First Step',
      description: 'Welcome to ESB — your journey starts here',
      earnedAt: new Date().toISOString()
    }],
    unlockedFeatures: ['basic_profile', 'browse_directory'],
    milestones: [{ event: 'profile_created', xpAwarded: 50, timestamp: new Date().toISOString() }]
  };
}

// ─── OOP CLASS HIERARCHY (PRESERVED) ─────────────────────────────
// These now build a plain object shaped for User.create().
// Note: id/timestamps removed — Sequelize generates those now.

class Coach {
  constructor(data, hashedPassword) {
    this.name = data.name;
    this.email = data.email;
    this.password = hashedPassword;
    this.role = 'coach';
    this.tier = 'basic';
    this.isVerified = false;

    // promoted column
    this.coachType = data.coachType;

    // ── ON THE FIELD ──
    this.ON_THE_FIELD = {
      sport: data.sport,
      position: data.position || 'Head Coach',
      coachType: data.coachType,
      school: data.school,
      division: data.division || null,
      coachingHistory: [],
      filmArchive: []
    };

    this.IN_THE_CLASSROOM = {
      education: [],
      certifications: [],
      graduationRate: null,
      academicSupport: ''
    };

    this.OFF_THE_FIELD = {
      bio: data.bio || '',
      coachingPhilosophy: '',
      playerDevelopmentApproach: '',
      communityInvolvement: [],
      formerPlayers: [],
      testimonials: [],
      socialLinks: { twitter: null, linkedin: null }
    };

    this.linkedProfiles = [];
    this.progression = createProgression('coach');
  }
}

class HighSchoolCoach extends Coach {
  constructor(data, hashedPassword) {
    super(data, hashedPassword);
    this.ON_THE_FIELD.roster = [];
    this.ON_THE_FIELD.coachType = 'highschool';
    this.coachType = 'highschool';
  }
}

class CollegeCoach extends Coach {
  constructor(data, hashedPassword) {
    super(data, hashedPassword);
    this.ON_THE_FIELD.wishList = {
      sports: [], positions: [], divisions: [],
      gpaMinimum: null, graduationYears: [], athleteTypes: []
    };
    this.ON_THE_FIELD.coachType = 'college';
    this.coachType = 'college';
    this.recruiting = {
      athletesContacted: [], athletesSaved: [],
      matchesReviewed: 0, openRosters: 0
    };
  }
}

function createCoach(data, hashedPassword) {
  if (data.coachType === 'highschool') return new HighSchoolCoach(data, hashedPassword);
  return new CollegeCoach(data, hashedPassword);
}

// Maps the OOP object's UPPERCASE IDMM keys → the model's JSONB columns
function toUserRecord(coachObj) {
  return {
    name: coachObj.name,
    email: coachObj.email,
    password: coachObj.password,
    role: coachObj.role,
    tier: coachObj.tier,
    isVerified: coachObj.isVerified,
    coachType: coachObj.coachType,
    primarySport: coachObj.ON_THE_FIELD.sport,   // promote sport → column
    school: coachObj.ON_THE_FIELD.school,         // promote school → column
    onTheField: coachObj.ON_THE_FIELD,
    inTheClassroom: coachObj.IN_THE_CLASSROOM,
    offTheField: coachObj.OFF_THE_FIELD,
    recruiting: coachObj.recruiting || {},        // only college coaches have this
    linkedProfiles: coachObj.linkedProfiles,
    progression: coachObj.progression
  };
}

// ─── ROUTES ──────────────────────────────────────────────────────

// POST /api/coaches/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, school, sport, coachType } = req.body;

    if (!name || !email || !password || !school || !sport || !coachType) {
      return res.status(400).json({
        error: 'name, email, password, school, sport, and coachType are required'
      });
    }
    if (!['highschool', 'college'].includes(coachType)) {
      return res.status(400).json({ error: 'coachType must be either highschool or college' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // factory builds the right type → mapper shapes it → Sequelize stores it
    const coachObj = createCoach(req.body, hashedPassword);
    const newCoach = await User.create(toUserRecord(coachObj));

    const { password: _, ...coachWithoutPassword } = newCoach.toJSON();
    res.status(201).json({
      message: 'Coach profile created successfully!',
      coach: coachWithoutPassword
    });

  } catch (error) {
    console.error('Coach registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/coaches/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const coach = await User.findOne({ where: { email, role: 'coach' } });
    if (!coach) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, coach.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { password: _, ...coachWithoutPassword } = coach.toJSON();
    res.status(200).json({ message: 'Login successful!', coach: coachWithoutPassword });

  } catch (error) {
    console.error('Coach login error:', error);   // ← fixed: was Error (capital), a bug in your original
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/coaches
router.get('/', async (req, res) => {
  try {
    const coaches = await User.findAll({
      where: { role: 'coach' },
      attributes: { exclude: ['password'] }
    });
    res.json(coaches);
  } catch (error) {
    res.status(500).json({ error: 'Could not retrieve coaches' });
  }
});

// GET /api/coaches/:id
router.get('/:id', async (req, res) => {
  try {
    const coach = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    if (!coach || coach.role !== 'coach') {
      return res.status(404).json({ error: 'Coach not found' });
    }
    res.json(coach);
  } catch (error) {
    res.status(500).json({ error: 'Could not retrieve coach' });
  }
});

module.exports = router;