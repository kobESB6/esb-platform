require('dotenv').config();

const express = require("express");
const app = express();

// Middleware — teaches Express to read JSON request bodies
app.use(express.json());

// Health check route — confirms server is alive
app.get("/", (req, res) => {
  res.send("ESB Backend Running ✅");
});

// Mount coach routes — any request to /api/coaches gets handled here
const coachRoutes = require("./routes/coaches");
app.use("/api/coaches", coachRoutes);

// Mount athlete routes — any request to /api/athletes gets handled here
const athleteRoutes = require("./routes/athletes");
app.use("/api/athletes", athleteRoutes);
// Mount matching routes — any request to /api/matching gets handled here
const matchingRoutes = require("./routes/matching");
app.use("/api/matching", matchingRoutes);

// Start the server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});