// backend/scripts/promote_recruiting_status.js
// ONE-OFF migration: move recruitingStatus from the onTheField blob to a real,
// searchable column. IDEMPOTENT — safe to run more than once.
// Athletes only. Coaches and legends stay null.
// Run from the backend/ folder:   node scripts/promote_recruiting_status.js

const sequelize = require('../config/database');

// Must match the isIn list in models/User.js
const ALLOWED = ['Uncommitted', 'Receiving Interest', 'Offered', 'Verbally Committed', 'Signed'];

async function run() {
  await sequelize.authenticate();
  console.log('Connected to DB.');

  // 1. Add the column (skips if it already exists)
  await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "recruitingStatus" VARCHAR(255);');
  console.log('Column ensured: recruitingStatus');

  // 2. Add the index so coaches can filter fast
  await sequelize.query('CREATE INDEX IF NOT EXISTS "users_recruitingStatus_idx" ON "users" ("recruitingStatus");');
  console.log('Index ensured.');

  // 3. Backfill: athletes only
  const [rows] = await sequelize.query(
    `SELECT id, "onTheField", "recruitingStatus" FROM "users" WHERE role = 'athlete';`
  );

  let copied = 0, defaulted = 0, skipped = 0;
  for (const r of rows) {
    if (r.recruitingStatus !== null) continue;   // already set: never overwrite

    const old = (r.onTheField || {}).recruitingStatus;
    let value;
    if (old && ALLOWED.includes(old)) {
      value = old; copied++;                     // clean value: copy it
    } else if (old == null || String(old).trim() === '') {
      value = 'Uncommitted'; defaulted++;        // missing: same default signup uses
    } else {
      skipped++;                                 // odd value: leave it, flag it
      console.log(`  ⚠️ unknown status ${JSON.stringify(old)} (row ${r.id})`);
      continue;
    }
    await sequelize.query(
      'UPDATE "users" SET "recruitingStatus" = :v WHERE id = :id;',
      { replacements: { v: value, id: r.id } }
    );
  }

  console.log(`Backfill: ${copied} copied · ${defaulted} defaulted · ${skipped} skipped.`);
  await sequelize.close();
  console.log('✅ Migration complete.');
}

if (require.main === module) run().catch(e => { console.error('Migration failed:', e); process.exit(1); });