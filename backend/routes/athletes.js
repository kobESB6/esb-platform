// express router for athletes
const express = require("express");
const router = express.Router();
const { registerAthlete, loginAthlete, getAthletes,} = require("../controllers/athleteController");

// Register athlete - POST API /api/athletes/register
router.post("/register", registerAthlete);

// Login athlete - POST API /api/athletes/login
router.post("/login", loginAthlete);

// Get all athletes - GET API /api/athletes
router.get("/get", getAthletes);

module.exports = router;