// backend/scripts/create_softball_stats.js
// ONE-OFF migration: create softball_stats.
//   softball_stats — Softball's searchable stats, one row per Softball athlete_sports row
// athlete_sports already exists (create_sport_tables.js), so this only adds Softball.
// IDEMPOTENT — safe to run more than once (IF NOT EXISTS everywhere).
// Run from the backend/ folder:   node scripts/create_softball_stats.js
//
// Column names are camelCase in quotes, same as the users table.
// Stat column names MUST match the "key" values in frontend/utils/sports.py.

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
    // softball_stats — real columns for stats coaches filter on
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "softball_stats" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "athleteSportId" UUID NOT NULL UNIQUE
                         REFERENCES "athlete_sports"("id") ON DELETE CASCADE,
        "battingAvg"     NUMERIC(4,3),
        "homeToFirst"    NUMERIC(4,2),
        "pitchSpeedMph"  INTEGER,
        "era"            NUMERIC(4,2),
        "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`, { transaction: t });
    console.log('Table ensured: softball_stats');

    // One index per searchable stat ("AVG over .350", "pitch speed over 60").
    for (const col of ['battingAvg', 'homeToFirst', 'pitchSpeedMph', 'era']) {
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS "softball_stats_${col}_idx" ON "softball_stats" ("${col}");`,
        { transaction: t });
    }
    console.log('Indexes ensured: 4 softball stats');
  });

  await sequelize.close();
  console.log('✅ Migration complete.');
}

if (require.main === module) run().catch(e => { console.error('Migration failed:', e); process.exit(1); });