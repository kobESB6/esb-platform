require('dotenv').config();

const express = require("express");
const app = express();
const path = require("path");
// Middleware — teaches Express to read JSON request bodies
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Health check route — confirms server is alive
app.get("/", (req, res) => {
  res.send("ESB Backend Running ✅");
});

// Mount coach routes — any request to /api/coaches gets handled here
const coachRoutes = require("./routes/coaches");
// Mount athlete routes — any request to /api/athletes gets handled here
const athleteRoutes = require("./routes/athletes");
// Mount matching routes — any request to /api/matching gets handled here
const matchingRoutes = require("./routes/matching");
// Mount legends route - any request to /api/legends gets handled here 
const legendRoutes = require('./routes/legends');
// Mount auth routes — password reset lives here, role-agnostic
const authRoutes = require('./routes/auth');

app.use("/api/coaches", coachRoutes);
app.use("/api/athletes", athleteRoutes);
app.use("/api/matching", matchingRoutes);
app.use('/api/legends', legendRoutes);
app.use('/api/auth', authRoutes);

// Start the server
const PORT = process.env.PORT || 3000;   // the host picks the port in production; 3000 on the Mac
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});