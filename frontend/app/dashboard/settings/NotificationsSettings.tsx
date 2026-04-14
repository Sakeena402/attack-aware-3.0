"use client";
import { useState } from "react";
import toast from "react-hot-toast";

export default function NotificationsSettings({ settings, onUpdate }: any) {
  const [saving, setSaving] = useState(false);

  const saveChanges = async () => {
    setSaving(true);
    try {
      const res = await fetch("http://localhost:5000/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: settings.notifications }),
      });
      if (res.ok) toast.success("Notification settings saved! ✅");
      else toast.error("Failed to save!");
    } catch {
      toast.error("Failed to save!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0f1117] border border-gray-700 rounded-xl p-6 space-y-5">
      <h2 className="text-xl font-semibold">Notification Settings</h2>

      {/* Toggle */}
      <div className="flex items-center justify-between bg-[#1a1d2e] border border-gray-600 rounded-lg px-4 py-3">
        <div>
          <p className="text-white font-medium">Enable Notifications</p>
          <p className="text-gray-400 text-sm">Receive alerts and updates</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.notifications || false}
            onChange={() => onUpdate({ notifications: !settings.notifications })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-600 peer-checked:bg-purple-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
        </label>
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