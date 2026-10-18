// backend/scripts/create_track_marks.js
// ONE-OFF migration: create the track_marks table.
//   track_marks — one row per event per Track athlete_sports row.
//   An athlete who runs the 100m and long jumps has 2 rows.
// Marks are stored as plain numbers:
//   time events     -> seconds (2:05.30 is 125.30)
//   distance events -> inches  (21' 6" is 258.00)
// Event names MUST match the "events" names in frontend/utils/sports.py.
// IDEMPOTENT — safe to run more than once (IF NOT EXISTS everywhere).
// Run from the backend/ folder:   node scripts/create_track_marks.js

const sequelize = require('../config/database');

async function run() {
  await sequelize.authenticate();

  // Guard against the dotenvx trap: show which database we're really in.
  const [[db]] = await sequelize.query('SELECT current_database() AS name;');
  console.log(`Connected to DB: ${db.name}`);
  if (db.name !== 'esb_db') {
    throw new Error(`Expected esb_db, got ${db.name}. Run this from inside backend/.`);
  }

  await sequelize.transaction(async (t) => {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "track_marks" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "athleteSportId" UUID NOT NULL
                         REFERENCES "athlete_sports"("id") ON DELETE CASCADE,
        "event"          VARCHAR(255) NOT NULL,
        "mark"           NUMERIC(7,2) NOT NULL,
        "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "track_marks_sport_event_unique" UNIQUE ("athleteSportId", "event")
      );`, { transaction: t });
    console.log('Table ensured: track_marks');

    // Coaches search "100m under 11.0", so index event and mark together.
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "track_marks_event_mark_idx"
        ON "track_marks" ("event", "mark");`, { transaction: t });
    console.log('Index ensured: event + mark');
  });

  console.log('✅ Migration complete.');
}

run()
  .catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());