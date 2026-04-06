const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

// Path to our data file — __dirname means "this file's folder"
const dataPath = path.join(__dirname, "../data/coaches.json");

// ─────────────────────────────────────────
// HELPER: Read all coaches from the file
// ─────────────────────────────────────────
function readCoaches() {
  if (!fs.existsSync(dataPath)) return [];
  const data = fs.readFileSync(dataPath, "utf-8");
  return JSON.parse(data);
}

// ─────────────────────────────────────────
// HELPER: Save coaches array back to file
// ─────────────────────────────────────────
function writeCoaches(coaches) {
  fs.writeFileSync(dataPath, JSON.stringify(coaches, null, 2));
}

// ─────────────────────────────────────────
// REGISTER — POST /api/coaches/register
// ─────────────────────────────────────────
async function registerCoach(req, res) {
  const { name, email, password, school, sport } = req.body;

  // Validate — all fields required
  if (!name || !email || !password || !school || !sport) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const coaches = readCoaches();

  // Block duplicate emails
  const exists = coaches.find(c => c.email === email);
  if (exists) {
    return res.status(400).json({ error: "Email already registered" });
  }

  // Hash the password — never store plain text
  const hashedPassword = await bcrypt.hash(password, 10);

  // Build the new coach object
  const newCoach = {
    id: uuidv4(),
    name,
    email,
    password: hashedPassword,
    school,
    sport,
    createdAt: new Date().toISOString()
  };

  // Save to file
  coaches.push(newCoach);
  writeCoaches(coaches);

  // Respond — never send password back
  res.status(201).json({
    message: "Coach profile created successfully!",
    coach: { id: newCoach.id, name, email, school, sport }
  });
}

// ─────────────────────────────────────────
// LOGIN — POST /api/coaches/login
// ─────────────────────────────────────────
async function loginCoach(req, res) {
  const { email, password } = req.body;

  // Validate — both fields required
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const coaches = readCoaches();

  // Find coach by email
  const coach = coaches.find(c => c.email === email);

  // Vague on purpose — don't reveal which field is wrong
  if (!coach) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Compare submitted password against stored hash
  const passwordMatch = await bcrypt.compare(password, coach.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Success — never send password back
  res.status(200).json({
    message: "Login successful!",
    coach: { id: coach.id, name: coach.name, email: coach.email, school: coach.school, sport: coach.sport }
  });
}

// ─────────────────────────────────────────
// GET ALL — GET /api/coaches
// ─────────────────────────────────────────
function getAllCoaches(req, res) {
  const coaches = readCoaches();

  // Strip passwords before sending — never expose hashes
  const safe = coaches.map(c => ({
    id: c.id,
    name: c.name,
    email: c.email,
    school: c.school,
    sport: c.sport,
    createdAt: c.createdAt
  }));

  res.status(200).json(safe);
}

// ─────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────
module.exports = { registerCoach, loginCoach, getAllCoaches };