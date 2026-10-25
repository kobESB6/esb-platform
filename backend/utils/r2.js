// utils/r2.js
// The ONE file that talks to Cloudflare R2 (it speaks the S3 language).
// The bucket is PRIVATE: nothing in it can be watched without a signed link.

const fs = require("fs");
const {
  S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const BUCKET = process.env.R2_BUCKET;
const PLAY_URL_SECONDS = 60 * 60;   // signed links work for 1 hour

const r2 = new S3Client({
  region: "auto",                      // R2 ignores region, but the SDK needs one
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Send a file from disk up to R2 under `key` (like "videos/1729-4821.mp4").
async function putVideo(localPath, key, contentType) {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fs.createReadStream(localPath),
    ContentLength: fs.statSync(localPath).size,   // R2 needs the size up front for a stream
    ContentType: contentType || "video/mp4",
  }));
}

// Remove a file from R2.
async function deleteVideo(key) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// Make a temporary link that lets a browser play one file for 1 hour.
function signPlayUrl(key) {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: PLAY_URL_SECONDS },
  );
}

module.exports = { putVideo, deleteVideo, signPlayUrl, BUCKET };