// utils/signPlayUrls.js
// Runs on every response. Right before JSON leaves the server, it finds
// clips stored in R2 (url starts with "r2:") and adds a fresh `playUrl`
// that a browser can use for 1 hour. Old /uploads clips are left alone.
// playUrl is never saved to the database — it's made fresh on every response.

const { signPlayUrl } = require("./r2");

const CLIP_FIELDS = ["highlights", "mediaArchive"];   // athletes, legends

async function addPlayUrls(user) {
  for (const field of CLIP_FIELDS) {
    const clips = user.onTheField[field];
    if (!Array.isArray(clips)) continue;
    for (const clip of clips) {
      if (typeof clip?.url === "string" && clip.url.startsWith("r2:")) {
        clip.playUrl = await signPlayUrl(clip.url.slice(3));   // drop "r2:"
      }
    }
  }
}

// Look through the response for anything shaped like a user and sign its clips.
// Covers { athlete: {...} }, a single user, and a list of users.
async function signBody(body, depth = 0) {
  if (!body || typeof body !== "object" || depth > 4) return;
  if (Array.isArray(body)) {
    for (const item of body) await signBody(item, depth + 1);
    return;
  }
  if (body.onTheField && typeof body.onTheField === "object") {
    await addPlayUrls(body);
  }
  for (const [k, value] of Object.entries(body)) {
    if (k !== "onTheField") await signBody(value, depth + 1);
  }
}

function signPlayUrls(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Turn database objects into plain data first, so we only touch a copy.
    const plain = body === undefined ? body : JSON.parse(JSON.stringify(body));
    signBody(plain)
      .then(() => originalJson(plain))
      .catch((err) => {
        console.error("signPlayUrls failed:", err);
        originalJson(plain);   // still answer; clips just won't have playUrl
      });
    return res;
  };
  next();
}

module.exports = { signPlayUrls };