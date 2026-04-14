import express from 'express';
import { authenticate } from '../middleware/auth.js';          // ✅ named import
import { getSettings, updateSettings } from '../controllers/settings.controller.js';

const router = express.Router();

// GET settings
router.get("/", authenticate, async (req, res) => {
  try {
    const settings = await getSettings(req.user);  // ✅ passes req.user
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// UPDATE settings  
router.put("/", authenticate, async (req, res) => {
  try {
    const updated = await updateSettings(req.user, req.body);  // ✅ passes req.user + body
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update settings" });
  }
});

// TEAM MANAGEMENT (Admin + Super Admin)
router.get("/team", authenticate, async (req, res) => {        // ✅ authMiddleware → authenticate
  if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Access denied" });
  }
  res.json({ message: "Team data for admin/super-admin" });
});

// SYSTEM CONTROLS (Super Admin only)
router.get("/system", authenticate, async (req, res) => {      // ✅ authMiddleware → authenticate
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Access denied" });
  }
  res.json({ message: "System controls data for super-admin" });
});

export default router;