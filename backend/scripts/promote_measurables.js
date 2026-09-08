// backend/scripts/promote_measurables.js
// ONE-OFF migration: promote height/weight from the onTheField JSONB blob to
// real, searchable columns. IDEMPOTENT — safe to run more than once.
//   height -> heightInches (INTEGER, total inches; 5'7" = 67)
//   weight -> weightLbs    (INTEGER, pounds)
// Run from the backend/ folder:   node scripts/promote_measurables.js

const sequelize = require('../config/database');

function sane(v, lo, hi) { return Number.isInteger(v) && v >= lo && v <= hi ? v : null; }

function parseHeightToInches(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  let m;
  if ((m = s.match(/^(\d{1,2})\s*['’]\s*(\d{1,2})/))) return sane((+m[1]) * 12 + (+m[2]), 36, 96); // 5'7"
  if ((m = s.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/)))    return sane((+m[1]) * 12 + (+m[2]), 36, 96); // 5-7
  if ((m = s.match(/^(\d{1,2})\s*['’]\s*$/)))          return sane((+m[1]) * 12, 36, 96);           // 5'
  if ((m = s.match(/^(\d{2,3})$/)))                    return sane(+m[1], 36, 96);                   // 67 (already inches)
  return null;
}

function parseWeightToLbs(raw) {
  if (raw === null || raw === undefined) return null;
  const m = String(raw).match(/(\d{2,3})/);
  return m ? sane(+m[1], 50, 500) : null;
}

async function run() {
  await sequelize.authenticate();
  console.log('Connected to DB.');

  await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "heightInches" INTEGER;');
  await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "weightLbs" INTEGER;');
  console.log('Columns ensured: heightInches, weightLbs');

  await sequelize.query('CREATE INDEX IF NOT EXISTS "users_heightInches_idx" ON "users" ("heightInches");');
  await sequelize.query('CREATE INDEX IF NOT EXISTS "users_weightLbs_idx" ON "users" ("weightLbs");');
  console.log('Indexes ensured.');

  const [rows] = await sequelize.query('SELECT id, "onTheField", "heightInches", "weightLbs" FROM "users";');
  let hFilled = 0, wFilled = 0, hSkip = 0, wSkip = 0;
  for (const r of rows) {
    const blob = r.onTheField || {};
    const sets = [], repl = { id: r.id };
    if (r.heightInches === null && blob.height != null && String(blob.height).trim() !== '') {
      const inches = parseHeightToInches(blob.height);
      if (inches !== null) { sets.push('"heightInches" = :h'); repl.h = inches; hFilled++; }
      else { hSkip++; console.log(`  ⚠️ unparseable height ${JSON.stringify(blob.height)} (row ${r.id})`); }
    }
    if (r.weightLbs === null && blob.weight != null && String(blob.weight).trim() !== '') {
      const lbs = parseWeightToLbs(blob.weight);
      if (lbs !== null) { sets.push('"weightLbs" = :w'); repl.w = lbs; wFilled++; }
      else { wSkip++; console.log(`  ⚠️ unparseable weight ${JSON.stringify(blob.weight)} (row ${r.id})`); }
    }
    if (sets.length) await sequelize.query(`UPDATE "users" SET ${sets.join(', ')} WHERE id = :id;`, { replacements: repl });
  }
  console.log(`Backfill: height ${hFilled} filled / ${hSkip} skipped · weight ${wFilled} filled / ${wSkip} skipped.`);
  await sequelize.close();
  console.log('✅ Migration complete.');
}

if (require.main === module) run().catch(e => { console.error('Migration failed:', e); process.exit(1); });
module.exports = { parseHeightToInches, parseWeightToLbs };
