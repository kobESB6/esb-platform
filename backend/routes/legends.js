// routes/legends.js
// Handles all Legend-related API endpoints
// Legend = former athlete, completed journey, giving back

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

// Path to our legends data file
const LEGENDS_FILE = path.join(__dirname, '../data/legends.json');

// ─── HELPER FUNCTIONS ───────────────────────────────────────────

// Read all legends from the JSON file
async function readLegends() {
  const data = await fs.readFile(LEGENDS_FILE, 'utf-8');
  return JSON.parse(data);
}

// Write updated legends array back to the file
async function writeLegends(legends) {
  await fs.writeFile(LEGENDS_FILE, JSON.stringify(legends, null, 2));
}

// Build the starting progression block — every new user gets this
function createProgression(role) {
  const startingRank = {
  athlete: 'Rookie',
  coach: 'New Coach',
  legend: 'Alumni'
};
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

// ─── ROUTES ─────────────────────────────────────────────────────

// POST /api/legends/register
// Creates a new Legend profile
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      primarySport,
      sportsPlayed,
      highestLevelPlayed,
      bio,
      occupation,
      mentorshipFocus
    } = req.body;

    // Make sure required fields are present
    if (!name || !email || !password || !primarySport) {
      return res.status(400).json({
        error: 'name, email, password, and primarySport are required'
      });
    }

    const legends = await readLegends();

    // Check if email is already registered
    const existingLegend = legends.find(l => l.email === email);
    if (existingLegend) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Build the full Legend profile using our Data Model v1 structure
    const newLegend = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: 'legend',
      profilePhoto: null,
      tier: 'basic',
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      ON_THE_FIELD: {
        primarySport,
        sportsPlayed: sportsPlayed || [primarySport],
        highestLevelPlayed: highestLevelPlayed || null,
        careerHistory: [],
        mediaArchive: []
      },

      IN_THE_CLASSROOM: {
  highSchoolsAttended: [],
  collegesAttended: [],
  academicAchievements: []
},

      OFF_THE_FIELD: {
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
        socialLinks: {
          twitter: null,
          instagram: null,
          linkedin: null
        }
      },

    linkedProfiles: [],

      mentorship: {
        isActiveMentor: true,
        athletesMentored: [],
        legendConnections: [],
        maxMentees: 5,
        mentorshipStyle: ''
      },

      progression: createProgression('legend')
    };

    // Add to array and save
    legends.push(newLegend);
    await writeLegends(legends);

    // Send back the new profile WITHOUT the password
    const { password: _, ...legendWithoutPassword } = newLegend;

    res.status(201).json({
      message: 'Legend profile created successfully',
      legend: legendWithoutPassword
    });

  } catch (error) {
    console.error('Legend registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// GET /api/legends
// Returns all legends (without passwords)
router.get('/', async (req, res) => {
  try {
    const legends = await readLegends();
    const safeLegends = legends.map(({ password, ...rest }) => rest);
    res.json(safeLegends);
  } catch (error) {
    res.status(500).json({ error: 'Could not retrieve legends' });
  }
});

// GET /api/legends/:id
// Returns a single Legend profile by ID
router.get('/:id', async (req, res) => {
  try {
    const legends = await readLegends();
    const legend = legends.find(l => l.id === req.params.id);

    if (!legend) {
      return res.status(404).json({ error: 'Legend not found' });
    }

    const { password, ...legendWithoutPassword } = legend;
    res.json(legendWithoutPassword);

  } catch (error) {
    res.status(500).json({ error: 'Could not retrieve legend' });
  }
});

// POST /api/legends/login
// Authenticates a Legend
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const legends = await readLegends();
    const legend = legends.find(l => l.email === email);

    if (!legend) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, legend.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Return full profile — no password
    const { password: _, ...legendWithoutPassword } = legend;

    res.status(200).json({
      message: 'Login successful!',
      legend: legendWithoutPassword
    });

  } catch (error) {
    console.error('Legend login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;