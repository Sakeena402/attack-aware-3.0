import express from 'express';
import { authenticate } from '../middleware/auth.js';          // ✅ named import
import { User } from '../models/User.js';                      // ✅ named import

const router = express.Router();

// GET all employees (admin + super-admin)
router.get("/", authenticate, async (req, res) => {
  try {
    if (!["admin", "super_admin"].includes((req as any).user.role)) {
      res.status(403).json({ message: "Access denied" });
      return;
    }
    const employees = await User.find({ role: "employee" }).select("-passwordHash"); // ✅ correct field
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE employee role (admin + super-admin)
router.put("/:id/role", authenticate, async (req, res) => {    // ✅ authMiddleware → authenticate
  try {
    if (!["admin", "super_admin"].includes((req as any).user.role)) {
      res.status(403).json({ message: "Access denied" });
      return;
    }
    const { role } = req.body;
    const employee = await User.findById(req.params.id);
    if (!employee) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    employee.role = role;
    await employee.save();
    res.json({ message: "Role updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
