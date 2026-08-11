// routes/athletes.js
// Handles all Athlete-related API endpoints — NOW POSTGRES-BACKED
// Athlete = current student athlete, journey in progress

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');   // ← replaces fs/path/JSON helpers
const multer = require("multer");
const path = require("path");
const fs = require("fs");
// ─── Video upload storage config (highlights) ───
const VIDEO_DIR = path.join(__dirname, "..", "uploads", "videos");
fs.mkdirSync(VIDEO_DIR, { recursive: true });   // self-heals dir on fresh clone

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);   // preserve .mp4 / .mov
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage });

const { execFileSync } = require("child_process");

// Read a video's duration in seconds via ffprobe. Returns a Number,
// or null if the file isn't a readable video (ffprobe exits non-zero).
function getVideoDuration(filePath) {
  try {
    const out = execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const seconds = parseFloat(out.toString().trim());
    return Number.isFinite(seconds) ? seconds : null;
  } catch (err) {
    return null;
  }
}

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
// POST /api/athletes/:id/highlights/upload
// Piece 1: receive a video file, store it on disk, return its URL.
// Deliberately does NOT touch the DB yet — attach-to-profile is a separate step.
router.post('/:id/highlights/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file received (field name must be "video")' });
  }

  // Chunk 2: probe the saved file's duration.
  const duration = getVideoDuration(req.file.path);

  // Chunk 3a: reject non-videos (ffprobe couldn't read a duration).
  if (duration === null) {
    fs.unlinkSync(req.file.path);   // clean up the bad file — no orphan
    return res.status(400).json({ error: 'That file is not a valid video.' });
  }

  // Chunk 3b: duration tier gate — basic capped at 10s, premium uncapped.
  const user = await User.findByPk(req.params.id);
  const tier = user?.tier || 'basic';                 // fail-safe: unknown → basic
  const DURATION_LIMIT = { basic: 10, premium: Infinity };
  const limit = DURATION_LIMIT[tier] ?? DURATION_LIMIT.basic;

  if (duration > limit) {
    fs.unlinkSync(req.file.path);   // don't keep a file we're rejecting
    return res.status(403).json({
      error: `Basic highlights are up to ${limit}s. Upgrade to premium to post longer film.`,
      tier, limit, duration,
    });
  }

  const url = `/uploads/videos/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, size: req.file.size, duration });
});

// POST /api/athletes/:id/highlights
// Piece 2: append a clip object to onTheField.highlights.
// (Tier gate lands here in piece 3.)
router.post('/:id/highlights', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || user.role !== 'athlete') {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    const { title, url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    const clip = {
      title: title || 'Untitled',
      url,
      source: 'upload',
      uploadedAt: new Date().toISOString(),
    };

    const existing = user.onTheField || {};
    const currentHighlights = existing.highlights || [];

    // ─── Piece 3: tier gate (count-based) ───
    // Basic athletes are capped; premium is unlimited (for now).
    const TIER_LIMITS = { basic: 2, premium: Infinity };
    const limit = TIER_LIMITS[user.tier] ?? TIER_LIMITS.basic;   // unknown tier → most restrictive
    if (currentHighlights.length >= limit) {
      return res.status(403).json({
        error: `Highlight limit reached for ${user.tier} tier (max ${limit}). Upgrade to add more.`,
        tier: user.tier,
        limit,
        current: currentHighlights.length,
      });
    }

    // Whole-object merge — same pattern as socialLinks.
    // Double-spread: new array (append) + new onTheField ref (Sequelize dirty-tracking).
    const highlights = [...currentHighlights, clip];
    user.onTheField = { ...existing, highlights };
    await user.save();
    const { password: _omit, ...safeUser } = user.toJSON();
    res.json(safeUser);
  } catch (err) {
    console.error('POST /api/athletes/:id/highlights failed:', err);
    res.status(500).json({ error: 'Failed to add highlight' });
  }
});

// DELETE /api/athletes/:id/highlights
// Remove a clip by url. Delete is FREE for all tiers (mission: athletes own their profile).
router.delete('/:id/highlights', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || user.role !== 'athlete') {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required to identify the clip' });

    const existing = user.onTheField || {};
    const currentHighlights = existing.highlights || [];

    // Filter out the clip whose url matches. If none matched, say so.
    const highlights = currentHighlights.filter((clip) => clip.url !== url);
    if (highlights.length === currentHighlights.length) {
      return res.status(404).json({ error: 'No highlight found with that url' });
    }

    // Whole-object merge — new array + new onTheField ref (Sequelize dirty-tracking).
    user.onTheField = { ...existing, highlights };
    await user.save();
    const { password: _omit, ...safeUser } = user.toJSON();
    res.json(safeUser);
  } catch (err) {
    console.error('DELETE /api/athletes/:id/highlights failed:', err);
    res.status(500).json({ error: 'Failed to delete highlight' });
  }
});

// PATCH /api/athletes/:id/highlights
// Edit a clip's title, identified by url. Free for all tiers.
router.patch('/:id/highlights', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || user.role !== 'athlete') {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    const { url, title } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required to identify the clip' });
    if (title === undefined) return res.status(400).json({ error: 'title is required' });

    const existing = user.onTheField || {};
    const currentHighlights = existing.highlights || [];

    // Map: rewrite the matching clip's title, leave others untouched.
    let found = false;
    const highlights = currentHighlights.map((clip) => {
      if (clip.url === url) {
        found = true;
        return { ...clip, title: title || 'Untitled' };
      }
      return clip;
    });
    if (!found) {
      return res.status(404).json({ error: 'No highlight found with that url' });
    }

    user.onTheField = { ...existing, highlights };
    await user.save();
    const { password: _omit, ...safeUser } = user.toJSON();
    res.json(safeUser);
  } catch (err) {
    console.error('PATCH /api/athletes/:id/highlights failed:', err);
    res.status(500).json({ error: 'Failed to edit highlight' });
  }
});
module.exports = router;