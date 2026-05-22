// express router for athletes
// routes/athletes.js
// Handles all Athlete-related API endpoints
// Athlete = current student athlete, journey in progress, building the product

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

// Path to our athletes data file
const ATHLETES_FILE = path.join(__dirname, '../data/athletes.json');

// ─── HELPER FUNCTIONS ────────────────────────────────────────────

// Read all athletes from the JSON file
async function readAthletes() {
  const data = await fs.readFile(ATHLETES_FILE, 'utf-8');
  return JSON.parse(data);
}

// Write updated athletes array back to the file
async function writeAthletes(athletes) {
  await fs.writeFile(ATHLETES_FILE, JSON.stringify(athletes, null, 2));
}

// Build the starting progression block — same engine as Legend
function createProgression() {
  return {
    level: 1,
    xp: 50,
    rank: 'Rookie',
    badges: [
      {
        id: uuidv4(),
        name: 'First Step',
        description: 'Welcome to ESB — your journey starts here',
        earnedAt: new Date().toISOString()
      }
    ],
    unlockedFeatures: ['basic_profile', 'browse_directory'],
    milestones: [
      {
        event: 'profile_created',
        xpAwarded: 50,
        timestamp: new Date().toISOString()
      }
    ]
  };
}

// ─── ROUTES ──────────────────────────────────────────────────────

// POST /api/athletes/register
// Creates a new Athlete profile with full IDMM structure
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      primarySport,
      position,
      height,
      weight,
      school,
      graduationYear,
      gpa
    } = req.body;

    // Required fields validation
    if (!name || !email || !password || !primarySport || !position ||
        !height || !weight || !school || !graduationYear || !gpa) {
      return res.status(400).json({
        error: 'name, email, password, primarySport, position, height, weight, school, graduationYear, and gpa are required'
      });
    }

    const athletes = await readAthletes();

    // Block duplicate email registration
    const existingAthlete = athletes.find(a => a.email === email);
    if (existingAthlete) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Build the full Athlete profile using Data Model v1
    const newAthlete = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: 'athlete',
      profilePhoto: null,
      tier: 'basic',
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      ON_THE_FIELD: {
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

      IN_THE_CLASSROOM: {
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

      OFF_THE_FIELD: {
        bio: '',
        personalStatement: '',
        myStory: '',
        careerInterests: [],
        leadershipRoles: [],
        communityService: [],
        characterTraits: [],
        familyBackground: {
          isPublic: false,
          statement: ''
        },
        references: [],
        testimonials: [],
        socialLinks: {
          twitter: null,
          instagram: null,
          hudl: null,
          linkedin: null
        }
      },

      recruiting: {
        targetSchools: [],
        targetDivisions: [],
        openToScholarship: true,
        openToWalkOn: false,
        coachesContacted: [],
        legendsMentoring: []
      },

      progression: createProgression()
    };

    // Save to data store
    athletes.push(newAthlete);
    await writeAthletes(athletes);

    // Return success — never send the password back
    const { password: _, ...athleteWithoutPassword } = newAthlete;

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
// Authenticates an athlete
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const athletes = await readAthletes();
    const athlete = athletes.find(a => a.email === email);

    if (!athlete) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, athlete.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Return safe profile — no password
    const { password: _, ...athleteWithoutPassword } = athlete;

    res.status(200).json({
      message: 'Login successful!',
      athlete: athleteWithoutPassword
    });

  } catch (error) {
    console.error('Athlete login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/athletes
// Returns all athletes without passwords
router.get('/', async (req, res) => {
  try {
    const athletes = await readAthletes();
    const safeAthletes = athletes.map(({ password, ...rest }) => rest);
    res.json(safeAthletes);
  } catch (error) {
    res.status(500).json({ error: 'Could not retrieve athletes' });
  }
});

// GET /api/athletes/:id
// Returns a single athlete profile by ID
router.get('/:id', async (req, res) => {
  try {
    const athletes = await readAthletes();
    const athlete = athletes.find(a => a.id === req.params.id);

    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    const { password, ...athleteWithoutPassword } = athlete;
    res.json(athleteWithoutPassword);

  } catch (error) {
    res.status(500).json({ error: 'Could not retrieve athlete' });
  }
});

module.exports = router;