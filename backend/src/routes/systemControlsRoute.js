import express from 'express';
import { authenticate } from '../middleware/auth.js';          // ✅ named import
import Setting from '../models/Setting.js';

const router = express.Router();

// GET system-wide settings (super-admin only)
router.get("/", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const settings = await Setting.find();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE system-wide settings (super-admin only)
router.put("/", authenticate, async (req, res) => {            // ✅ authMiddleware → authenticate
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const { data } = req.body;
    await Setting.updateOne({}, data, { upsert: true });
    res.json({ message: "System settings updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;