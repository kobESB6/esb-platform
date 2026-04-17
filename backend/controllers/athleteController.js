const fs = require("fs" );
const path = require("path" );
const bcrypt = require("bcrypt" );
const { v4: uuidv4 } = require("uuid" );

const dataPath = path.join(__dirname, "../data/athletes.json");

// Helper function to read athletes data
function readAthletes() {
    if (!fs.existsSync(dataPath)) return [];
    const data = fs.readFileSync(dataPath, "utf-8" );
    return JSON.parse(data);
}

// Helper function to write athletes data
function writeAthletesData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) );
}

// Athlete Class Definition Profile Registration and Authentication
class Athlete {
    constructor(data, hashedPassword) {
        this.id = uuidv4();
        this.name = data.name;
        this.email = data.email;
        this.password = hashedPassword;
        this.sport = data.sport;
        this.position = data.position;
        this.height = data.height; 
        this.weight = data.weight;
        this.gpa = data.gpa;
        this.school = data.school;
        this.graduationYear = data.graduationYear;
        this.highlights = data.highlights || "";
        this.createdAt = new Date(). toISOString();
    }
}

// Register a new athlete API
// POST /api/athletes/register object
async function registerAthlete(req,res) {
    const { name, email, password, sport, position, height, weight, gpa, school, graduationYear } = req.body;

    // Basic validation
    if (!name || !email || !password || !sport || !position || !height ||
    !weight || !gpa || !school || !graduationYear ) {
        return res.status(400).json({ message: "All fields are required." });
    }

    // Check if athlete already exists
    const athletes = readAthletes();

    // Check for existing email/athletes
    const existingAthlete = athletes.find(athlete => athlete.email === email);

    //Block duplicate email registration
    if (existingAthlete) {
        return res.status(400).json({ message: "Email already in use." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 13);

    // Create new athlete instance
    const newAthlete = new Athlete(req.body, hashedPassword);

    // Save athlete to data store
    athletes.push(newAthlete);
    writeAthletesData(athletes);

    // Return success response
    res.status(201).json({ message: "Athlete profile created successfully!", athlete: {  id: newAthlete.id, 
                                name: newAthlete.name,
                                email: newAthlete.email,
                                sport: newAthlete.sport, 
                                position: newAthlete.position, 
                                height: newAthlete.height, 
                                weight: newAthlete.weight, 
                                gpa: newAthlete.gpa, 
                                school: newAthlete.school, 
                                graduationYear: newAthlete.graduationYear, 
                                highlights: newAthlete.highlights

    }
     });
}

// Authenticate athlete LOGIN - POST API /api/athletes/login
async function loginAthlete(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const athletes = readAthletes();
  const athlete = athletes.find(a => a.email === email);

  if (!athlete) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const passwordMatch = await bcrypt.compare(password, athlete.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.status(200).json({
    message: "Login successful!",
    athlete: {
      id: athlete.id,
      name: athlete.name,
      email: athlete.email,
      sport: athlete.sport,
      position: athlete.position,
      school: athlete.school
    }
  });
}
// Get athlete profile by ID - GET /api/athletes/:id
function getAthletes(req, res) {
    const { athletes } = readAthletes();

    // map to find athlete profile 
    const safe = athletes.map(a => ({
        id: a.id,
        name: a.name,
        email: a.eamil,
        sport: a.sport,
        position: a.postion,
        height: a.height,
        weight: a.weight,
        gpa: a.gpa,
        school: a.school,
        graduationYear: a.graduationYear,
        highlcreatedAt: a.createdAt
    }));  
    res.status(200).json(safe);
}

//Export controller functions
module.exports = {
    registerAthlete, loginAthlete, getAthletes
};
