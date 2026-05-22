// routes/coaches.js
// Handles all Coach-related API endpoints
// Two coach types: HighSchoolCoach (roster) and CollegeCoach (wishList)
// OOP class hierarchy preserved — factory pattern creates the right type

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

// Path to our coaches data file
const COACHES_FILE = path.join(__dirname, '../data/coaches.json');

// ─── HELPER FUNCTIONS ────────────────────────────────────────────

// Read all coaches from the JSON file
async function readCoaches() {
  const data = await fs.readFile(COACHES_FILE, 'utf-8');
  return JSON.parse(data);
}

// Write updated coaches array back to the file
async function writeCoaches(coaches) {
  await fs.writeFile(COACHES_FILE, JSON.stringify(coaches, null, 2));
}

// Build the starting progression block — same engine across all user types
function createProgression(role) {
    const startingRank = {
  athlete: 'Rookie',
  coach: 'New Coach',
  legend: 'Alumni'
};

  return {
    level: 1,
    xp: 50,
    rank: startingRank?.[role] ?? 'Rookie',
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

// ─── OOP CLASS HIERARCHY ─────────────────────────────────────────
// Preserved from Week 1 — coachType drives the dashboard experience
// High school coaches manage rosters
// College coaches manage wishlists
// Same base, different tools

class Coach {
  constructor(data, hashedPassword) {
    this.id = uuidv4();
    this.name = data.name;
    this.email = data.email;
    this.password = hashedPassword;
    this.role = 'coach';
    this.profilePhoto = null;
    this.tier = 'basic';
    this.isVerified = false;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();

    // ── ON THE FIELD ──────────────────────────────
    this.ON_THE_FIELD = {
      sport: data.sport,
      position: data.position || 'Head Coach',
      coachType: data.coachType,
      school: data.school,
      division: data.division || null,
      coachingHistory: [],
      filmArchive: []
    };

    // ── IN THE CLASSROOM ──────────────────────────
    this.IN_THE_CLASSROOM = {
      education: [],
      certifications: [],
      graduationRate: null,
      academicSupport: ''
    };

    // ── OFF THE FIELD ─────────────────────────────
    this.OFF_THE_FIELD = {
      bio: data.bio || '',
      coachingPhilosophy: '',
      playerDevelopmentApproach: '',
      communityInvolvement: [],
      formerPlayers: [],
      testimonials: [],
      socialLinks: {
        twitter: null,
        linkedin: null
      }
    };

    // ── LINKED PROFILES ───────────────────────────
    // Connects this profile to other roles this person holds
    // e.g. a coach who was also an athlete, a legend who also coaches
    this.linkedProfiles = [];

    // ── PROGRESSION ───────────────────────────────
   this.progression = createProgression('coach');
  }

  getDashboardType() {
    return 'coach';
  }
}

// High School Coach — manages a current roster
class HighSchoolCoach extends Coach {
  constructor(data, hashedPassword) {
    super(data, hashedPassword);
    // Add roster to ON_THE_FIELD — HS coaches manage current players
    this.ON_THE_FIELD.roster = [];
    this.ON_THE_FIELD.coachType = 'highschool';
  }

  getDashboardType() {
    return 'highschool_coach';
  }
}

// College Coach — manages a recruiting wishlist
class CollegeCoach extends Coach {
  constructor(data, hashedPassword) {
    super(data, hashedPassword);
    // Add wishList to ON_THE_FIELD — college coaches recruit
    this.ON_THE_FIELD.wishList = {
      sports: [],
      positions: [],
      divisions: [],
      gpaMinimum: null,
      graduationYears: [],
      athleteTypes: []
    };
    this.ON_THE_FIELD.coachType = 'college';
    // College coaches also track recruiting activity
    this.recruiting = {
      athletesContacted: [],
      athletesSaved: [],
      matchesReviewed: 0,
      openRosters: 0
    };
  }

  getDashboardType() {
    return 'college_coach';
  }
}

// Factory function — builds the right coach type automatically
function createCoach(data, hashedPassword) {
  if (data.coachType === 'highschool') {
    return new HighSchoolCoach(data, hashedPassword);
  }
  return new CollegeCoach(data, hashedPassword);
}

// ─── ROUTES ──────────────────────────────────────────────────────

// POST /api/coaches/register
// Creates a new Coach profile — type determined by coachType field
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      school,
      sport,
      coachType
    } = req.body;

    // Required fields validation
    if (!name || !email || !password || !school || !sport || !coachType) {
      return res.status(400).json({
        error: 'name, email, password, school, sport, and coachType are required'
      });
    }

    // Validate coachType value
    if (!['highschool', 'college'].includes(coachType)) {
      return res.status(400).json({
        error: 'coachType must be either highschool or college'
      });
    }

    const coaches = await readCoaches();

    // Block duplicate email registration
    const existingCoach = coaches.find(c => c.email === email);
    if (existingCoach) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Factory creates the right coach type automatically
    const newCoach = createCoach(req.body, hashedPassword);

    // Save to data store
    coaches.push(newCoach);
    await writeCoaches(coaches);

    // Return success — never send the password back
    const { password: _, ...coachWithoutPassword } = newCoach;

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
// Authenticates a coach
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const coaches = await readCoaches();
    const coach = coaches.find(c => c.email === email);

    if (!coach) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, coach.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Return full profile — no password
    const { password: _, ...coachWithoutPassword } = coach;

    res.status(200).json({
      message: 'Login successful!',
      coach: coachWithoutPassword
    });

  } catch (error) {
    console.error('Coach login error:', Error);

    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/coaches
// Returns all coaches without passwords
router.get('/', async (req, res) => {
  try {
    const coaches = await readCoaches();
    const safeCoaches = coaches.map(({ password, ...rest }) => rest);
    res.json(safeCoaches);
  } catch (error) {
    res.status(500).json({ error: 'Could not retrieve coaches' });
  }
});

// GET /api/coaches/:id
// Returns a single coach profile by ID
router.get('/:id', async (req, res) => {
  try {
    const coaches = await readCoaches();
    const coach = coaches.find(c => c.id === req.params.id);

    if (!coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    const { password, ...coachWithoutPassword } = coach;
    res.json(coachWithoutPassword);

  } catch (error) {
    res.status(500).json({ error: 'Could not retrieve coach' });
  }
});

module.exports = router;