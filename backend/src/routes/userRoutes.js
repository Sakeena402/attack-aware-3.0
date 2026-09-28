import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { toggle2FA } from '../controllers/authController.js';
import { otpRateLimiter } from '../middleware/security.js';

const router = express.Router();

// GET USER PROFILE
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email }).select('-passwordHash');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE PROFILE
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.name = name || user.name;
    user.email = email || user.email;
    await user.save();
    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// CHANGE PASSWORD
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // ✅ fetch full user from DB using email from token
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Error changing password' });
  }
});

// TOGGLE 2FA
// Phase 1 (enable=true, no code): sends OTP → returns { otpSent: true }
// Phase 2 (enable=true, code):    verifies OTP → sets twoFactorEnabled=true
// Disable (enable=false, password): verifies password → sets twoFactorEnabled=false
router.patch('/me/2fa', authenticate, otpRateLimiter, toggle2FA);

export default router;