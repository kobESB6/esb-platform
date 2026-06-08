// routes/athletes.js
// Handles all Athlete-related API endpoints — NOW POSTGRES-BACKED
// Athlete = current student athlete, journey in progress

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');   // ← replaces fs/path/JSON helpers

// NOTE: readAthletes/writeAthletes helpers are GONE — the DB is our store now.

// Build the starting progression block — same engine as before
function createProgression(role) {
  return {
    level: 1,
    xp: 50,
    rank: 'Rookie',
    badges: [
      {
        name: 'First Step',
        description: 'Welcome to ESB — your journey starts here',
        earnedAt: new Date().toISOString()
      }
    ],
    unlockedFeatures: ['basic_profile', 'browse_directory'],
    milestones: [
      { event: 'profile_created', xpAwarded: 50, timestamp: new Date().toISOString() }
    ]
  };
}

// ─── ROUTES ──────────────────────────────────────────────────────

// POST /api/athletes/register
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, password, primarySport, position,
      height, weight, school, graduationYear, gpa
    } = req.body;

    // Required fields validation (unchanged)
    if (!name || !email || !password || !primarySport || !position ||
        !height || !weight || !school || !graduationYear || !gpa) {
      return res.status(400).json({
        error: 'name, email, password, primarySport, position, height, weight, school, graduationYear, and gpa are required'
      });
    }

    // Friendly duplicate check (the UNIQUE constraint is the real backstop)
    // Normalize email so stored + looked-up values always match
    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ where: { email: cleanEmail } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // CREATE — promoted fields at top level (→ columns), full bodies in JSONB
    const newAthlete = await User.create({
      // identity columns
      name,
      email: cleanEmail,
      password: hashedPassword,
      role: 'athlete',
      tier: 'basic',
      isVerified: false,

      // promoted matchable columns
      primarySport,
      sportsPlayed: [primarySport],   // seeded with primary; more added via edit later
      position,
      school,
      graduationYear,
      gpa,

      // JSONB — ON THE FIELD
      onTheField: {
        primarySport,
        sportsPlayed: [primarySport],
        position,
        height,
        weight,
        school,
        graduationYear,
        recruitingStatus: 'Uncommitted',
        athleteType: null,
        stats: [],
        awards: [],
        highlights: []
      },

      // JSONB — IN THE CLASSROOM
      inTheClassroom: {
        gpa,
        sat: null,
        act: null,
        intendedMajor: '',
        academicAchievements: [],
        apOrIbCourses: [],
        transcriptVerified: false,
        eligibilityStatus: 'Not Checked',
        clearinghouseStatus: 'Not Registered'
      },

      // JSONB — OFF THE FIELD
      offTheField: {
        bio: '',
        personalStatement: '',
        myStory: '',
        careerInterests: [],
        leadershipRoles: [],
        communityService: [],
        characterTraits: [],
        familyBackground: { isPublic: false, statement: '' },
        references: [],
        testimonials: [],
        socialLinks: { twitter: null, instagram: null, hudl: null, linkedin: null }
      },

      recruiting: {
        targetSchools: [],
        targetDivisions: [],
        openToScholarship: true,
        openToWalkOn: false,
        coachesContacted: [],
        legendsMentoring: []
      },

      linkedProfiles: [],
      progression: createProgression('athlete')
    });

    // Never send the password back
    const { password: _, ...athleteWithoutPassword } = newAthlete.toJSON();

    res.status(201).json({
      message: 'Athlete profile created successfully!',
      athlete: athleteWithoutPassword
    });

  } catch (error) {
    console.error('Athlete registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/athletes/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const athlete = await User.findOne({ where: { email: cleanEmail, role: 'athlete' } });

    if (!athlete) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, athlete.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { password: _, ...athleteWithoutPassword } = athlete.toJSON();
    res.status(200).json({
      message: 'Login successful!',
      athlete: athleteWithoutPassword
    });

  } catch (error) {
    console.error('Athlete login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/athletes — all athletes, no passwords
router.get('/', async (req, res) => {
  try {
    const athletes = await User.findAll({
      where: { role: 'athlete' },
      attributes: { exclude: ['password'] }   // DB-level password exclusion
    });
    res.json(athletes);
  } catch (error) {
    res.status(500).json({ error: 'Could not retrieve athletes' });
  }
});

// GET /api/athletes/:id — single athlete by id
router.get('/:id', async (req, res) => {
  try {
    const athlete = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    if (!athlete || athlete.role !== 'athlete') {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    res.json(athlete);
  } catch (error) {
    res.status(500).json({ error: 'Could not retrieve athlete' });
  }
});
// PATCH /api/athletes/:id
// Partial update — send ONLY the fields you want to change.
// Merges into existing data so untouched fields (and other blobs) survive.
router.patch('/:id', async (req, res) => {
  try {
    // 1. Find the athlete. findByPk = "find by primary key" (the UUID).
    const user = await User.findByPk(req.params.id);

    // 2. Guard: no such user, or it's not an athlete row.
    //    (We don't want the athlete endpoint editing a coach by ID.)
    if (!user || user.role !== 'athlete') {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    // 3. Pull every updatable field out of the body.
    //    Anything the client didn't send arrives as `undefined`,
    //    and we simply skip those below — that's what makes this a PATCH.
    const {
      // promoted scalar columns:
      name, primarySport, position, school, graduationYear, gpa, profilePhoto,
      // array column:
      sportsPlayed, addSport,
      // JSONB blobs:
      onTheField, inTheClassroom, offTheField,
    } = req.body;

    // ─── CATEGORY 1: scalar columns — assign only if provided ───
    // `!== undefined` (not a truthy check) so a deliberate "" or 0 still saves.
    if (name           !== undefined) user.name           = name;
    if (primarySport   !== undefined) user.primarySport   = primarySport;
    if (position       !== undefined) user.position       = position;
    if (school         !== undefined) user.school         = school;
    if (graduationYear !== undefined) user.graduationYear = graduationYear;
    if (gpa            !== undefined) user.gpa            = gpa;
    if (profilePhoto   !== undefined) user.profilePhoto   = profilePhoto;

    // ─── CATEGORY 2: array column (sportsPlayed) ───
    // Two ways to touch it:
    //   addSport: "track"  → append one sport (your "add a 2nd sport" case)
    //   sportsPlayed: [...] → replace the whole list outright
    // Either way we build a NEW array (new reference → Sequelize notices).
    if (addSport !== undefined) {
      // Spread the old array + the new value. Set() de-dupes so adding
      // a sport already present is a harmless no-op, not a duplicate.
      user.sportsPlayed = [...new Set([...user.sportsPlayed, addSport])];
    } else if (sportsPlayed !== undefined) {
      user.sportsPlayed = sportsPlayed;   // full replace of the array
    }

    // ─── CATEGORY 3: JSONB blobs — shallow spread-merge ───
    // `{ ...old, ...incoming }` does two jobs at once:
    //   (a) new object reference, so Sequelize detects the change
    //   (b) keeps untouched keys, overwrites the ones sent
    // ⚠️ SHALLOW ONLY. If a blob ever holds NESTED objects (e.g.
    //    onTheField.stats), this replaces that nested object wholesale.
    //    Revisit with a deep-merge here when the stats forms arrive.
    if (onTheField !== undefined) {
      user.onTheField = { ...user.onTheField, ...onTheField };
    }
    if (inTheClassroom !== undefined) {
      user.inTheClassroom = { ...user.inTheClassroom, ...inTheClassroom };
    }
    if (offTheField !== undefined) {
      user.offTheField = { ...user.offTheField, ...offTheField };
    }

    // 4. Persist. One UPDATE, only the attributes Sequelize saw change.
    await user.save();

    // 5. Return the updated row, minus the password hash.
    const { password: _omit, ...safeUser } = user.toJSON();
    res.json(safeUser);

  } catch (err) {
    console.error('PATCH /api/athletes/:id failed:', err);
    res.status(500).json({ error: 'Failed to update athlete' });
  }
});
module.exports = router;