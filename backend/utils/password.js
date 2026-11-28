// utils/password.js — ONE password rule for signup and reset.
// NIST SP 800-63B-4: at least 15 characters when a password is the only way to log in.
// Max 64 characters. bcrypt only reads the first 72 bytes, so bytes are capped too.
const MIN_LENGTH = 15;
const MAX_LENGTH = 64;

// Returns an error message if the password breaks the rule, or null if it's fine.
function passwordProblem(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required';
  }
  const length = [...password].length; // counts emoji as 1 character
  if (length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters`;
  }
  if (length > MAX_LENGTH || Buffer.byteLength(password, 'utf8') > 72) {
    return `Password must be ${MAX_LENGTH} characters or fewer`;
  }
  return null;
}

module.exports = { passwordProblem, MIN_LENGTH, MAX_LENGTH };