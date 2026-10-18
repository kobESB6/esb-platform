// backend/scripts/create_sport_tables.js
// ONE-OFF migration: create the per-sport tables.
//   athlete_sports  — one row per athlete per sport (sport, position, game-stats blob)
//   football_stats  — Football's searchable stats, one row per Football athlete_sports row
// IDEMPOTENT — safe to run more than once (IF NOT EXISTS everywhere).
// Both tables are built in one transaction: all or nothing.
// Run from the backend/ folder:   node scripts/create_sport_tables.js
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
    // 1. athlete_sports — the shared layer every sport uses
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "athlete_sports" (
        "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"    UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "sport"     VARCHAR(255) NOT NULL,
        "position"  VARCHAR(255),
        "stats"     JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "athlete_sports_user_sport_unique" UNIQUE ("userId", "sport")
      );`, { transaction: t });
    console.log('Table ensured: athlete_sports');

    // Coaches search "Football + QB", so index sport and position together.
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS "athlete_sports_sport_position_idx" ON "athlete_sports" ("sport", "position");',
      { transaction: t });
    console.log('Index ensured: sport + position');

    // 2. football_stats — real columns for stats coaches filter on
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "football_stats" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "athleteSportId" UUID NOT NULL UNIQUE
                         REFERENCES "athlete_sports"("id") ON DELETE CASCADE,
        "fortyTime"      NUMERIC(4,2),
        "shuttleTime"    NUMERIC(4,2),
        "verticalInches" NUMERIC(3,1),
        "benchMaxLbs"    INTEGER,
        "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`, { transaction: t });
    console.log('Table ensured: football_stats');

    // One index per searchable stat ("40 under 4.6", "vertical over 30").
    for (const col of ['fortyTime', 'shuttleTime', 'verticalInches', 'benchMaxLbs']) {
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS "football_stats_${col}_idx" ON "football_stats" ("${col}");`,
        { transaction: t });
    }
    console.log('Indexes ensured: 4 football stats');
  });

  await sequelize.close();
  console.log('✅ Migration complete.');
}

if (require.main === module) run().catch(e => { console.error('Migration failed:', e); process.exit(1); });