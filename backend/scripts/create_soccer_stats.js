// backend/scripts/create_soccer_stats.js
// ONE-OFF migration: create soccer_stats.
//   soccer_stats — Soccer's searchable stats, one row per Soccer athlete_sports row
// athlete_sports already exists (create_sport_tables.js), so this only adds Soccer.
// IDEMPOTENT — safe to run more than once (IF NOT EXISTS everywhere).
// Run from the backend/ folder:   node scripts/create_soccer_stats.js
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
    // soccer_stats — real columns for stats coaches filter on. All season totals.
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "soccer_stats" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "athleteSportId" UUID NOT NULL UNIQUE
                         REFERENCES "athlete_sports"("id") ON DELETE CASCADE,
        "goals"          INTEGER,
        "assists"        INTEGER,
        "saves"          INTEGER,
        "cleanSheets"    INTEGER,
        "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`, { transaction: t });
    console.log('Table ensured: soccer_stats');

    // One index per searchable stat ("10+ goals", "8+ clean sheets").
    for (const col of ['goals', 'assists', 'saves', 'cleanSheets']) {
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS "soccer_stats_${col}_idx" ON "soccer_stats" ("${col}");`,
        { transaction: t });
    }
    console.log('Indexes ensured: 4 soccer stats');
  });

  await sequelize.close();
  console.log('✅ Migration complete.');
}

if (require.main === module) run().catch(e => { console.error('Migration failed:', e); process.exit(1); });