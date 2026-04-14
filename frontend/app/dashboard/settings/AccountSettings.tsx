"use client";

import { useState } from "react";

export default function AccountSettings({ settings, onUpdate }: any) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saveChanges = async () => {
  setSaving(true);
  setMessage(null);
  try {
    const res = await fetch("http://localhost:5000/api/settings", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: settings.name,
        email: settings.email,
        phoneNumber: settings.phoneNumber,
        department: settings.department,
        theme: settings.theme,
      }),
    });
    if (res.ok) setMessage("✅ Account settings saved!");
    else setMessage("❌ Failed to save settings.");
  } catch (err) {
    setMessage("❌ Failed to save settings.");
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="bg-[#0f1117] border border-gray-700 rounded-xl p-6 space-y-5">
      <h2 className="text-xl font-semibold">Account</h2>

      {/* Name */}
      <div>
        <label className="block font-medium mb-1">Full Name</label>
        <input
          type="text"
          className="border rounded p-2 w-full bg-transparent"
          value={settings.name || ""}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
      </div>

      {/* Email */}
      <div>
        <label className="block font-medium mb-1">Email</label>
        <input
          type="email"
          className="border rounded p-2 w-full bg-transparent"
          value={settings.email || ""}
          onChange={(e) => onUpdate({ email: e.target.value })}
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block font-medium mb-1">Phone Number</label>
        <input
          type="text"
          className="border rounded p-2 w-full bg-transparent"
          value={settings.phoneNumber || ""}
          onChange={(e) => onUpdate({ phoneNumber: e.target.value })}
        />
      </div>

      {/* Department */}
      <div>
        <label className="block font-medium mb-1">Department</label>
        <input
          type="text"
          className="border rounded p-2 w-full bg-transparent"
          value={settings.department || ""}
          onChange={(e) => onUpdate({ department: e.target.value })}
        />
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Theme</label>
        <select
          className="w-full bg-[#1a1d2e] border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          value={settings.theme || "dark"}
          onChange={(e) => onUpdate({ theme: e.target.value })}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      {message && <p className="text-sm">{message}</p>}

      <button
        onClick={saveChanges}
        disabled={saving}
        className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}