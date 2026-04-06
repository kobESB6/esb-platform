const express = require("express");
const router = express.Router();
const { registerCoach, loginCoach, getAllCoaches } = require("../controllers/coachController");

router.post("/register", registerCoach);
router.post("/login", loginCoach);
router.get("/", getAllCoaches);
// Here are current routes that we have defined in the coachController.js file. 
// Each route corresponds to a specific function that handles the logic for that endpoint. 
// The router will be used in the main server file to mount these routes under the /api/coaches path.

module.exports = router;