import express from 'express';
import { authenticate } from '../middleware/auth.js';          // ✅ named import
import Setting from '../models/Setting.js';

const router = express.Router();

// GET system-wide settings (super-admin only)
router.get("/", authenticate, async (req, res) => {
  try {
    if ((req as any).user.role !== "super_admin") {
      res.status(403).json({ message: "Access denied" });
      return;
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
    if ((req as any).user.role !== "super_admin") {
      res.status(403).json({ message: "Access denied" });
      return;
    }
    const { data } = req.body;
    await Setting.updateOne({}, data, { upsert: true });
    res.json({ message: "System settings updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
