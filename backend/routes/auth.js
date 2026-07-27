// routes/auth.js — ROLE-AGNOSTIC password reset.
// Operates on the single User model by EMAIL (unique across all roles), so
// unlike login it does NOT filter by role.
//   POST /api/auth/request-reset   -> mints a token, console-logs the link
//   POST /api/auth/reset-password  -> verifies token, writes a new password hash
// Token is hashed at rest, 1h expiry, single-use. request-reset is enumeration-safe.

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const GENERIC_RESET_RESPONSE = {
  message: 'If an account exists for that email, a reset link has been generated.'
};

// POST /api/auth/request-reset  { email }
router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: cleanEmail } });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(rawToken, 10);
      const expiry = new Date(Date.now() + TOKEN_TTL_MS);

      user.resetToken = hashedToken;
      user.resetTokenExpiry = expiry;
      await user.save();

      const resetLink =
        `http://localhost:8501/ResetPassword?email=${encodeURIComponent(cleanEmail)}&token=${rawToken}`;
      console.log('\n================ PASSWORD RESET LINK ================');
      console.log(`  For: ${cleanEmail}`);
      console.log(`  ${resetLink}`);
      console.log(`  (valid for 1 hour)`);
      console.log('====================================================\n');
    }

    return res.status(200).json(GENERIC_RESET_RESPONSE);
  } catch (error) {
    console.error('request-reset error:', error);
    return res.status(500).json({ error: 'Server error during reset request' });
  }
});

// POST /api/auth/reset-password  { email, token, newPassword }
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'email, token, and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: cleanEmail } });

    const genericFailure = { error: 'Invalid or expired reset token' };

    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      return res.status(400).json(genericFailure);
    }
    if (new Date(user.resetTokenExpiry).getTime() < Date.now()) {
      user.resetToken = null;
      user.resetTokenExpiry = null;
      await user.save();
      return res.status(400).json(genericFailure);
    }
    const tokenMatch = await bcrypt.compare(token, user.resetToken);
    if (!tokenMatch) {
      return res.status(400).json(genericFailure);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    return res.status(200).json({ message: 'Password has been reset. You can now log in.' });
  } catch (error) {
    console.error('reset-password error:', error);
    return res.status(500).json({ error: 'Server error during password reset' });
  }
});

module.exports = router;
