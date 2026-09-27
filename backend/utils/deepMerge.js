// backend/utils/deepMerge.js
// Recursive merge for JSONB blob updates: nested plain objects MERGE, while
// arrays / primitives / null REPLACE wholesale. Returns a NEW object so
// Sequelize detects the change.
function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function deepMerge(target, source) {
  if (!isPlainObject(source)) return source;
  const out = isPlainObject(target) ? { ...target } : {};
  for (const key of Object.keys(source)) {
    const sv = source[key], tv = out[key];
    out[key] = (isPlainObject(sv) && isPlainObject(tv)) ? deepMerge(tv, sv) : sv;
  }
  return out;
}
module.exports = { deepMerge };
