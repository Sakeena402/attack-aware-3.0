"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function SecuritySettings({ settings, onUpdate }: any) {
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle2FA = () => {
    onUpdate({ twoFactorAuth: !settings.twoFactorAuth });
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      // Save 2FA setting
      const res = await fetch("http://localhost:5000/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoFactorAuth: settings.twoFactorAuth }),
      });
      if (!res.ok) throw new Error("Failed to save settings");

      // Change password if provided
      if (password) {
        if (!currentPassword) {
          toast.error("Please enter your current password");
          setSaving(false);
          return;
        }
        const res2 = await fetch("http://localhost:5000/api/users/change-password", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword: password }),
        });
        if (!res2.ok) throw new Error("Failed to change password");
        setPassword("");
        setCurrentPassword("");
      }

      toast.success("Security settings updated! ✅");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save! ❌");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0f1117] border border-gray-700 rounded-xl p-6 space-y-5">
      <h2 className="text-xl font-semibold">Security</h2>

      {/* 2FA */}
      <div className="flex items-center justify-between">
        <span>Two-Factor Authentication</span>
        <input
          type="checkbox"
          checked={settings.twoFactorAuth || false}
          onChange={toggle2FA}
        />
      </div>

      {/* Change Password */}
      <div className="space-y-2">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Current Password</label>
          <input
            type="password"
            placeholder="Current Password"
            className="w-full bg-[#1a1d2e] border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">New Password</label>
          <input
            type="password"
            placeholder="New Password"
            className="w-full bg-[#1a1d2e] border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={saveChanges}
        disabled={saving}
        className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}