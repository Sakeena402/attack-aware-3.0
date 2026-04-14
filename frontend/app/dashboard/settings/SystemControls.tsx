"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function SystemControls({ role }: { role: string }) {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/system-controls", {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (res.ok) setSettings(data);
        else toast.error("Failed to load system settings");
      } catch {
        toast.error("Failed to load system settings");
      } finally {
        setLoading(false);
      }
    };

    if (role === "super_admin") fetchSettings();
  }, [role]);

  const handleChange = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("http://localhost:5000/api/system-controls", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: settings }),
      });
      if (res.ok) toast.success("System settings saved! ✅");
      else toast.error("Failed to save!");
    } catch {
      toast.error("Failed to save!");
    } finally {
      setSaving(false);
    }
  };

  if (role !== "super_admin") return null;

  return (
    <div className="bg-[#0f1117] border border-gray-700 rounded-xl p-6 space-y-5">
      <h2 className="text-xl font-semibold">System Controls</h2>

      {loading && <p className="text-gray-400 animate-pulse">Loading system settings...</p>}

      {!loading && (
        <>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Platform Name</label>
            <input
              type="text"
              value={settings.platformName || ""}
              onChange={(e) => handleChange("platformName", e.target.value)}
              className="w-full bg-[#1a1d2e] border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              placeholder="Platform Name"
            />
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      )}
    </div>
  );
}