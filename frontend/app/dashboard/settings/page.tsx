"use client";

import { useEffect, useState } from "react";
import AccountSettings from "./AccountSettings";
import SecuritySettings from "./SecuritySettings";
import NotificationsSettings from "./NotificationsSettings";
import TeamManagement from "./TeamManagement";
import SystemControls from "./SystemControls";

interface UserSettings {
  theme: string;
  notifications: boolean;
  twoFactorAuth: boolean;
  role: "super_admin" | "admin" | "employee";
  name: string;
  email: string;
  department: string;
  phoneNumber?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("account");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/settings", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (res.ok) setSettings(data);
        else setError("Failed to load settings");
      } catch (err) {
        setError("Cannot connect to server");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdate = (updatedFields: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev!, ...updatedFields }));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 animate-pulse text-lg">Loading settings...</div>
    </div>
  );

  if (error) return (
    <div className="p-6 text-red-400">{error}</div>
  );

  if (!settings) return null;

  const isAdmin = settings.role === "admin";
  const isSuperAdmin = settings.role === "super_admin";

  const tabs = [
    { id: "account", label: "👤 Account" },
    { id: "security", label: "🔒 Security" },
    { id: "notifications", label: "🔔 Notifications" },
    ...(isAdmin || isSuperAdmin ? [{ id: "team", label: "👥 Team" }] : []),
    ...(isSuperAdmin ? [{ id: "system", label: "⚙️ System" }] : []),
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          ⚙️ Settings
        </h1>
        <p className="text-gray-400 mt-1">
          Manage your account and platform preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-0 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium transition-all rounded-t-lg ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white border-b-2 border-purple-500"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "account" && (
          <AccountSettings settings={settings} onUpdate={handleUpdate} />
        )}
        {activeTab === "security" && (
          <SecuritySettings settings={settings} onUpdate={handleUpdate} />
        )}
        {activeTab === "notifications" && (
          <NotificationsSettings settings={settings} onUpdate={handleUpdate} />
        )}
        {activeTab === "team" && (isAdmin || isSuperAdmin) && (
          <TeamManagement role={settings.role} />
        )}
        {activeTab === "system" && isSuperAdmin && (
          <SystemControls role={settings.role} />
        )}
      </div>
    </div>
  );
}