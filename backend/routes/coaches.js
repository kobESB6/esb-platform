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
    this.wishlist = {                        // ← top-level, matches model + PATCH route
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
    wishlist: coachObj.wishlist || {},
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
    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ where: { email: cleanEmail } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // factory builds the right type → mapper shapes it → Sequelize stores it
    const coachObj = createCoach({...req.body, email: cleanEmail }, hashedPassword);
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

    const cleanEmail = email.trim().toLowerCase();
    const coach = await User.findOne({ where: { email: cleanEmail, role: 'coach' } });
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


// PATCH /api/coaches/:id 
// per-section inline eidt. Same proven shape as the sthlete route: 
// scalars asign -if-provided, JSONB blobs shallow spread-merge. 
router.patch('/:id', async (req, res) => {
  try { 
    // 1. Find the coach by primary key (UUID)
    const user = await User.findByPk(req.params.id);
    
    // 2. Guard: must exist and be a coach  the coach endpoint 
    // must not edit as athlete or legend row by ID.
    if (!user || user.role !== 'coach') {
      return res.status(404).json({ error: 'Coach not found'});
    }
    // 3. Pull every updatable field. Anything not sent = undefind = skipped.
    const {
      //  promoted scalar columns:
      name, coachType, primarySport, school, 
      // JSON blobs:
      onTheField, inTheClassroom, offTheField, recruiting, wishlist,
    } = req.body;

    //   CATEGORY 1: scalar columns - assign only if provided 
    //  `!== undefined` so deliberate "" still saves intentionally.
    if (name          !== undefined) user.name          = name;
    if (coachType     !== undefined) user.coachType     = coachType;
    if (primarySport  !== undefined) user.primarySport  = primarySport;
    if (school        !== undefined) user.school        = school;

    //  CATEGOREY 2: JSON blobs - shallow spread-merge 
    //  `{ ... old, ...incoming }` : new object reference (Sequelize detects it)
    //  AND keeps untouched keys while overwriting the ones sent.
    //  SHALLOW: nested objects (wishlist.sports, recruiting..athletesSaved)
    // are replaced wholesale - each from must send its whole sub-object
    if (onTheField      !== undefined) user.onTheField          = { ...user.onTheField, ...onTheField };
    if (inTheClassroom  !== undefined) user.inTheClassroom      = { ...user.inTheClassroom, ...inTheClassroom }; 
    if (offTheField     !== undefined) user.offTheField         = { ...user.offTheField, ...offTheField };
    if (recruiting      !== undefined) user.recruiting          = { ...user.recruiting, ...recruiting };
    if (wishlist        !== undefined) user.wishlist            = { ...user.wishlist, ...wishlist };
    
    // 4. Persist - one UPDATE, only changed attrubutes
    await user.save();

    // 5. Return updates row minus the password has 
    const { password: _omit, ...safeUser } = user.toJSON();
    res.json(safeUser);

  } catch (err) {
    console.error('PATCH /api/coaches/:id failed:', err);
    res.status(500).json({ error: 'Failed to update coach' });
  }
  });

module.exports = router;