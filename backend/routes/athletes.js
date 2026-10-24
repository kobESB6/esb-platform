// routes/athletes.js
// Handles all Athlete-related API endpoints — NOW POSTGRES-BACKED
// Athlete = current student athlete, journey in progress

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');   // ← replaces fs/path/JSON helpers
const { sanitizeUser } = require('../utils/sanitizeUser');
const { deepMerge } = require('../utils/deepMerge');
const { signToken, requireAuth, requireSelf } = require('../middleware/auth');
const AthleteSport  = require('../models/AthleteSport');
const FootballStats = require('../models/FootballStats');
const TrackMark     = require('../models/TrackMark');
const SoftballStats = require('../models/SoftballStats');
const { FOOTBALL, TRACK, SOFTBALL } = require('../config/sportRules');
const { attachMediaRoutes } = require('./mediaRoutes');
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

       // Required = identity + searchable essentials only (Option B, Aug 29 2026).
    // gpa/height/weight deferred to profile-completion — lowers signup barrier
    // for overlooked HS athletes. FLAGGED: revisit if completion/search-quality data warrants.
    if (!name || !email || !password || !primarySport || !position ||
        !school || !graduationYear) {
      return res.status(400).json({
        error: 'name, email, password, primarySport, position, school, and graduationYear are required'
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
      gpa: gpa || null,
      recruitingStatus: 'Uncommitted',   // every new athlete starts here (column = only truth)

      // JSONB — ON THE FIELD
      onTheField: {
        
        position,
        height: height || null,
        weight: weight || null,
        school,
        graduationYear,
        athleteType: null,
        stats: [],
        awards: [],
        highlights: []
      },

      // JSONB — IN THE CLASSROOM
      inTheClassroom: {
        gpa: gpa || null,
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
      athlete: sanitizeUser(athleteWithoutPassword)
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
      token: signToken(athleteWithoutPassword),
      athlete: sanitizeUser(athleteWithoutPassword)
    });

  } catch (error) {
    console.error('Athlete login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/athletes — all athletes, no passwords
router.get('/', requireAuth, async (req, res) => {
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
router.get('/:id', requireAuth, async (req, res) => {
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
router.patch('/:id', requireAuth, requireSelf, async (req, res) => {
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
      heightInches, weightLbs, recruitingStatus,
      // array column:
  
      sportsPlayed, addSport,
      // JSONB blobs:
      onTheField, inTheClassroom, offTheField,
    } = req.body;

    // ─── CATEGORY 1: scalar columns — assign only if provided ───
    // `!== undefined` (not a truthy check) so a deliberate "" or 0 still saves.
      if (name !== undefined) {
      // Trim spaces. A blank name would leave the card with no name.
      const cleanName = typeof name === "string" ? name.trim() : "";
      if (!cleanName) {
        return res.status(400).json({ error: "Name can't be blank." });
      }
      if (cleanName.length > 60) {
        return res.status(400).json({ error: "Name must be 60 characters or less." });
      }
      user.name = cleanName;
    }
    if (primarySport   !== undefined) user.primarySport   = primarySport;
    if (position       !== undefined) user.position       = position;
    if (school         !== undefined) user.school         = school;
    if (graduationYear !== undefined) user.graduationYear = graduationYear;
    if (gpa            !== undefined) user.gpa            = gpa;
    if (profilePhoto   !== undefined) user.profilePhoto   = profilePhoto;
    if (heightInches   !== undefined) user.heightInches   = heightInches;
    if (weightLbs      !== undefined) user.weightLbs      = weightLbs;
    if (recruitingStatus !== undefined) user.recruitingStatus = recruitingStatus;

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
      user.onTheField = deepMerge(user.onTheField, onTheField);
    }
    if (inTheClassroom !== undefined) {
      user.inTheClassroom = deepMerge(user.inTheClassroom, inTheClassroom);
    }
    if (offTheField !== undefined) {
      user.offTheField = deepMerge(user.offTheField, offTheField);
    }
    // 4. Persist. One UPDATE, only the attributes Sequelize saw change.
    await user.save();

    // 5. Return the updated row, minus the password hash.
    const { password: _omit, ...safeUser } = user.toJSON();
    res.json(safeUser);

    } catch (err) {
    // Bad value (like a status not on the allowed list) → 400 "your request was wrong",
    // not 500 "the server broke".
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: err.errors.map(e => e.message).join('; ') });
    }
    console.error('PATCH /api/athletes/:id failed:', err);
    res.status(500).json({ error: 'Failed to update athlete' });
  }
});
// ─── Highlights CRUD — shared factory (see routes/mediaRoutes.js) ───
// Athlete keeps its tier caps: basic = 2 clips, 10s each; premium unlimited.
attachMediaRoutes(router, User, {
  role: 'athlete',
  field: 'highlights',
  base: 'highlights',
  countLimits: { basic: 2, premium: Infinity },
  durationLimits: { basic: 10, premium: Infinity },
    clipExtra: {},
  labels: { durationUnit: 'highlights', countLabel: 'Highlight', noun: 'highlight' },
  sportField: true,   // highlights live with their sport card
});

// ==================================================================
// FOOTBALL DETAILS  — /api/athletes/:id/sports/football
// One shape in and out (position, stats blob, and the 4 stat columns
// side by side), so Streamlit fills the form from GET and sends the same
// keys back on PATCH.
// ==================================================================
function footballView(row) {
  const f = row && row.football;
  return {
    sport: 'Football',
    exists: !!row,
    position: row ? row.position : null,
    stats: row ? row.stats : {},
    fortyTime:      f ? f.fortyTime      : null,
    shuttleTime:    f ? f.shuttleTime    : null,
    verticalInches: f ? f.verticalInches : null,
    benchMaxLbs:    f ? f.benchMaxLbs    : null,
  };
}

async function loadFootball(userId) {
  return AthleteSport.findOne({
    where: { userId, sport: 'Football' },
    include: [{ model: FootballStats, as: 'football' }],
  });
}

// GET — any logged-in user can read (coaches view athletes).
router.get('/:id/sports/football', requireAuth, async (req, res) => {
  try {
    const athlete = await User.findByPk(req.params.id, { attributes: ['id', 'role'] });
    if (!athlete || athlete.role !== 'athlete') {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    const row = await loadFootball(athlete.id);
    res.json(footballView(row));
  } catch (error) {
    console.error('GET football failed:', error);
    res.status(500).json({ error: 'Could not retrieve Football details' });
  }
});

// PATCH — athletes edit only their own. Creates the row on first save;
// after that, only the fields sent change. null clears a stat.
router.patch('/:id/sports/football', requireAuth, requireSelf, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || user.role !== 'athlete') {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    // sportsPlayed is the one place that says which sports someone plays.
    if (!(user.sportsPlayed || []).includes('Football')) {
      return res.status(400).json({ error: 'Add Football to your sports before saving Football details' });
    }

    const { position, stats } = req.body;

    // Position: must be a registry position; null or "" clears it.
    let newPosition;
    if (position !== undefined) {
      if (position === null || position === '') {
        newPosition = null;
      } else if (!FOOTBALL.positions.includes(position)) {
        return res.status(400).json({ error: `Unknown Football position: ${position}` });
      } else {
        newPosition = position;
      }
    }

    // Stats blob: must be a plain object if sent.
    if (stats !== undefined && (stats === null || typeof stats !== 'object' || Array.isArray(stats))) {
      return res.status(400).json({ error: 'stats must be an object' });
    }

    // Searchable stats: number, in range; null or "" clears.
    const statChanges = {};
    for (const [key, rule] of Object.entries(FOOTBALL.stats)) {
      const v = req.body[key];
      if (v === undefined) continue;
      if (v === null || v === '') { statChanges[key] = null; continue; }
      if (typeof v !== 'number' && typeof v !== 'string') {
        return res.status(400).json({ error: `${key} must be a number` });
      }
      const n = Number(v);
      if (!Number.isFinite(n)) {
        return res.status(400).json({ error: `${key} must be a number` });
      }
      if (rule.integer && !Number.isInteger(n)) {
        return res.status(400).json({ error: `${key} must be a whole number` });
      }
      if (n < rule.min || n > rule.max) {
        return res.status(400).json({ error: `${key} must be between ${rule.min} and ${rule.max}` });
      }
      statChanges[key] = n;
    }

    // Both tables in one transaction: all or nothing.
    await AthleteSport.sequelize.transaction(async (t) => {
      const [row] = await AthleteSport.findOrCreate({
        where: { userId: user.id, sport: 'Football' },
        transaction: t,
      });
      if (newPosition !== undefined) row.position = newPosition;
      // JSONB needs a NEW object or Sequelize won't see the change.
      if (stats !== undefined) row.stats = { ...(row.stats || {}), ...stats };
      await row.save({ transaction: t });

      const [fs] = await FootballStats.findOrCreate({
        where: { athleteSportId: row.id },
        transaction: t,
      });
      fs.set(statChanges);
      await fs.save({ transaction: t });
    });

    const fresh = await loadFootball(user.id);
    res.json(footballView(fresh));
  } catch (error) {
    console.error('PATCH football failed:', error);
       res.status(500).json({ error: 'Could not save Football details' });
  }
});

// ==================================================================
// SOFTBALL DETAILS  — /api/athletes/:id/sports/softball
// Same shape as Football: position, stats blob, and the 4 stat columns
// side by side, so Streamlit fills the form from GET and sends the same
// keys back on PATCH.
// ==================================================================
function softballView(row) {
  const s = row && row.softball;
  return {
    sport: 'Softball',
    exists: !!row,
    position: row ? row.position : null,
    stats: row ? row.stats : {},
    battingAvg:    s ? s.battingAvg    : null,
    homeToFirst:   s ? s.homeToFirst   : null,
    pitchSpeedMph: s ? s.pitchSpeedMph : null,
    era:           s ? s.era           : null,
  };
}

async function loadSoftball(userId) {
  return AthleteSport.findOne({
    where: { userId, sport: 'Softball' },
    include: [{ model: SoftballStats, as: 'softball' }],
  });
}

// GET — any logged-in user can read (coaches view athletes).
router.get('/:id/sports/softball', requireAuth, async (req, res) => {
  try {
    const athlete = await User.findByPk(req.params.id, { attributes: ['id', 'role'] });
    if (!athlete || athlete.role !== 'athlete') {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    const row = await loadSoftball(athlete.id);
    res.json(softballView(row));
  } catch (error) {
    console.error('GET softball failed:', error);
    res.status(500).json({ error: 'Could not retrieve Softball details' });
  }
});

// PATCH — athletes edit only their own. Creates the row on first save;
// after that, only the fields sent change. null clears a stat.
router.patch('/:id/sports/softball', requireAuth, requireSelf, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || user.role !== 'athlete') {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    // sportsPlayed is the one place that says which sports someone plays.
    if (!(user.sportsPlayed || []).includes('Softball')) {
      return res.status(400).json({ error: 'Add Softball to your sports before saving Softball details' });
    }

    const { position, stats } = req.body;

    // Position: must be a registry position; null or "" clears it.
    let newPosition;
    if (position !== undefined) {
      if (position === null || position === '') {
        newPosition = null;
      } else if (!SOFTBALL.positions.includes(position)) {
        return res.status(400).json({ error: `Unknown Softball position: ${position}` });
      } else {
        newPosition = position;
      }
    }

    // Stats blob: must be a plain object if sent.
    if (stats !== undefined && (stats === null || typeof stats !== 'object' || Array.isArray(stats))) {
      return res.status(400).json({ error: 'stats must be an object' });
    }

    // Searchable stats: number, in range; null or "" clears.
    const statChanges = {};
    for (const [key, rule] of Object.entries(SOFTBALL.stats)) {
      const v = req.body[key];
      if (v === undefined) continue;
      if (v === null || v === '') { statChanges[key] = null; continue; }
      if (typeof v !== 'number' && typeof v !== 'string') {
        return res.status(400).json({ error: `${key} must be a number` });
      }
      const n = Number(v);
      if (!Number.isFinite(n)) {
        return res.status(400).json({ error: `${key} must be a number` });
      }
      if (rule.integer && !Number.isInteger(n)) {
        return res.status(400).json({ error: `${key} must be a whole number` });
      }
      if (n < rule.min || n > rule.max) {
        return res.status(400).json({ error: `${key} must be between ${rule.min} and ${rule.max}` });
      }
      statChanges[key] = n;
    }

    // Both tables in one transaction: all or nothing.
    await AthleteSport.sequelize.transaction(async (t) => {
      const [row] = await AthleteSport.findOrCreate({
        where: { userId: user.id, sport: 'Softball' },
        transaction: t,
      });
      if (newPosition !== undefined) row.position = newPosition;
      // JSONB needs a NEW object or Sequelize won't see the change.
      if (stats !== undefined) row.stats = { ...(row.stats || {}), ...stats };
      await row.save({ transaction: t });

      const [ss] = await SoftballStats.findOrCreate({
        where: { athleteSportId: row.id },
        transaction: t,
      });
      ss.set(statChanges);
      await ss.save({ transaction: t });
    });

    const fresh = await loadSoftball(user.id);
    res.json(softballView(fresh));
  } catch (error) {
    console.error('PATCH softball failed:', error);
    res.status(500).json({ error: 'Could not save Softball details' });
  }
});

// ==================================================================
// TRACK & FIELD DETAILS  — /api/athletes/:id/sports/track-field
// "track-field" in the address because "&" and spaces break URLs.
// Shape in and out: { marks: { "100m": 10.85, "Long Jump": 258 } }
// PATCH only touches the events it's sent. null or "" deletes that mark.
// ==================================================================
const TRACK_SPORT = 'Track & Field';

function trackView(row) {
  const marks = {};
  if (row && row.trackMarks) {
    const byEvent = {};
    for (const m of row.trackMarks) byEvent[m.event] = m.mark;
    // Registry order, so the form and card always list events the same way.
    for (const name of Object.keys(TRACK.events)) {
      if (name in byEvent) marks[name] = byEvent[name];
    }
  }
  return { sport: TRACK_SPORT, exists: !!row, marks };
}

async function loadTrack(userId) {
  return AthleteSport.findOne({
    where: { userId, sport: TRACK_SPORT },
    include: [{ model: TrackMark, as: 'trackMarks' }],
  });
}

// GET — any logged-in user can read (coaches view athletes).
router.get('/:id/sports/track-field', requireAuth, async (req, res) => {
  try {
    const athlete = await User.findByPk(req.params.id, { attributes: ['id', 'role'] });
    if (!athlete || athlete.role !== 'athlete') {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    const row = await loadTrack(athlete.id);
    res.json(trackView(row));
  } catch (error) {
    console.error('GET track failed:', error);
    res.status(500).json({ error: 'Could not retrieve Track & Field details' });
  }
});

// PATCH — athletes edit only their own. Creates the Track row on first save.
router.patch('/:id/sports/track-field', requireAuth, requireSelf, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || user.role !== 'athlete') {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    if (!(user.sportsPlayed || []).includes(TRACK_SPORT)) {
      return res.status(400).json({ error: 'Add Track & Field to your sports before saving Track details' });
    }

    const { marks } = req.body;
    if (marks === undefined || marks === null || typeof marks !== 'object' || Array.isArray(marks)) {
      return res.status(400).json({ error: 'marks must be an object, like {"100m": 10.85}' });
    }

    // Check every mark BEFORE saving any. One bad mark = nothing saved.
    const changes = [];
    for (const [event, v] of Object.entries(marks)) {
      const rule = TRACK.events[event];
      if (!rule) {
        return res.status(400).json({ error: `Unknown Track event: ${event}` });
      }
      if (v === null || v === '') { changes.push({ event, mark: null }); continue; }
      if (typeof v !== 'number' && typeof v !== 'string') {
        return res.status(400).json({ error: `${event} must be a number` });
      }
      const n = Number(v);
      if (!Number.isFinite(n)) {
        return res.status(400).json({ error: `${event} must be a number` });
      }
      if (n < rule.min || n > rule.max) {
        const unit = rule.kind === 'time' ? 'seconds' : 'inches';
        return res.status(400).json({ error: `${event} must be between ${rule.min} and ${rule.max} ${unit}` });
      }
      changes.push({ event, mark: n });
    }

    // All marks in one transaction: all or nothing.
    await AthleteSport.sequelize.transaction(async (t) => {
      const [row] = await AthleteSport.findOrCreate({
        where: { userId: user.id, sport: TRACK_SPORT },
        transaction: t,
      });
      for (const { event, mark } of changes) {
        const existing = await TrackMark.findOne({
          where: { athleteSportId: row.id, event },
          transaction: t,
        });
        if (mark === null) {
          if (existing) await existing.destroy({ transaction: t });
        } else if (existing) {
          existing.mark = mark;
          await existing.save({ transaction: t });
        } else {
          await TrackMark.create({ athleteSportId: row.id, event, mark }, { transaction: t });
        }
      }
    });

    const fresh = await loadTrack(user.id);
    res.json(trackView(fresh));
  } catch (error) {
    console.error('PATCH track failed:', error);
    res.status(500).json({ error: 'Could not save Track & Field details' });
  }
});
module.exports = router;