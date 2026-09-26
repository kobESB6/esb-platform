// backend/utils/sanitizeUser.js
// Remove secrets before sending a user object to the client.
function sanitizeUser(userInstanceOrJson) {
  const u = (userInstanceOrJson && typeof userInstanceOrJson.toJSON === 'function')
    ? userInstanceOrJson.toJSON()
    : { ...userInstanceOrJson };
  delete u.password;
  delete u.resetToken;
  delete u.resetTokenExpiry;
  return u;
}
module.exports = { sanitizeUser };
