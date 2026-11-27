// backend/utils/publicProfile.js
// Cleans a user row before it leaves the server.
// CHILD SAFETY: contact info only goes to the owner or a verified coach.

const ALWAYS_HIDDEN = ['password', 'resetToken', 'resetTokenExpiry'];

function canSeeContact(viewer, profileId) {
  if (!viewer) return false;
  if (viewer.id === profileId) return true;               // your own profile
  return viewer.role === 'coach' && viewer.isVerified === true;
}

function cleanProfile(user, viewer) {
  const data = user.toJSON ? user.toJSON() : { ...user };
  for (const field of ALWAYS_HIDDEN) delete data[field];

  if (!canSeeContact(viewer, data.id)) {
    delete data.email;
    if (data.offTheField && data.offTheField.socialLinks) {
      data.offTheField = { ...data.offTheField };          // copy, don't touch the original
      delete data.offTheField.socialLinks;
    }
  }
  return data;
}

module.exports = { cleanProfile };