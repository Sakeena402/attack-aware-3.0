'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/authContext';
import { apiService } from '@/app/services/api';
import { Card } from '@/components/ui/card';
import {
  User, Mail, Phone, Users, Calendar,
  Pencil, Check, X, KeyRound, Eye, EyeOff,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  gender: string;
}

// ── Field Row Component ───────────────────────────────────────────────────────

function FieldRow({
  icon: Icon,
  label,
  value,
  editing,
  fieldKey,
  form,
  onChange,
  type = 'text',
  options,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  editing: boolean;
  fieldKey: keyof ProfileForm;
  form: ProfileForm;
  onChange: (k: keyof ProfileForm, v: string) => void;
  type?: string;
  options?: string[];
}) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-slate-700/40 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
          {label}
        </p>
        {editing ? (
          options ? (
            <select
              value={form[fieldKey]}
              onChange={e => onChange(fieldKey, e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {options.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              value={form[fieldKey]}
              onChange={e => onChange(fieldKey, e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            />
          )
        ) : (
          <p className="text-sm font-medium text-foreground">
            {value || <span className="text-slate-500 italic">Not set</span>}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { state, refreshUser } = useAuth();
  const user = state.user;

  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    name:   user?.name   ?? '',
    email:  user?.email  ?? '',
    phone:  (user as any)?.phone  ?? '',
    gender: (user as any)?.gender ?? '',
  });

  // Password change state
  const [showPwd, setShowPwd]           = useState(false);
  const [pwdForm, setPwdForm]           = useState({ current: '', next: '', confirm: '' });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNextPwd, setShowNextPwd]   = useState(false);
  const [pwdSaving, setPwdSaving]       = useState(false);
  const [pwdMsg, setPwdMsg]             = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleChange(k: keyof ProfileForm, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handleCancel() {
    setForm({
      name:   user?.name   ?? '',
      email:  user?.email  ?? '',
      phone:  (user as any)?.phone  ?? '',
      gender: (user as any)?.gender ?? '',
    });
    setEditing(false);
    setMsg(null);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      setMsg({ type: 'error', text: 'Name and email are required.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await apiService.put<any>('/users/profile', form);
      // Update auth context with new user data
      if (res?.data?.user) await refreshUser();
else await refreshUser();
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
      setEditing(false);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message ?? 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange() {
    if (!pwdForm.current || !pwdForm.next || !pwdForm.confirm) {
      setPwdMsg({ type: 'error', text: 'All password fields are required.' });
      return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (pwdForm.next.length < 6) {
      setPwdMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setPwdSaving(true);
    setPwdMsg(null);
    try {
      await apiService.put('/users/change-password', {
  currentPassword: pwdForm.current,
  newPassword:     pwdForm.next,
});
      setPwdMsg({ type: 'success', text: 'Password changed successfully.' });
      setPwdForm({ current: '', next: '', confirm: '' });
      setShowPwd(false);
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err?.message ?? 'Failed to change password.' });
    } finally {
      setPwdSaving(false);
    }
  }

  const joinedAt = (user as any)?.createdAt
    ? new Date((user as any).createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <User className="w-6 h-6 text-blue-400" />
          My Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage your personal account details
        </p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden">

          {/* Avatar Header */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-5 flex items-center gap-4 border-b border-slate-700/50">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{user?.name}</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 capitalize mt-1">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Fields */}
          <div className="px-6">
            <FieldRow
              icon={User} label="Full Name"
              value={user?.name ?? ''} editing={editing}
              fieldKey="name" form={form} onChange={handleChange}
            />
            <FieldRow
              icon={Mail} label="Email Address"
              value={user?.email ?? ''} editing={editing}
              fieldKey="email" form={form} onChange={handleChange}
              type="email"
            />
            <FieldRow
              icon={Phone} label="Phone Number"
              value={(user as any)?.phone ?? ''} editing={editing}
              fieldKey="phone" form={form} onChange={handleChange}
              type="tel"
            />
            <FieldRow
              icon={Users} label="Gender"
              value={(user as any)?.gender ?? ''} editing={editing}
              fieldKey="gender" form={form} onChange={handleChange}
              options={['', 'Male', 'Female', 'Other', 'Prefer not to say']}
            />
            {/* Joined — always read-only */}
            <div className="flex items-start gap-4 py-4">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Joined At
                </p>
                <p className="text-sm font-medium text-foreground">{joinedAt}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 pb-5">
            {msg && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
                msg.type === 'success'
                  ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
              }`}>
                {msg.text}
              </div>
            )}

            {editing ? (
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditing(true); setMsg(null); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold rounded-xl transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Change Password Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-slate-800/60 border-slate-700/50 p-6">
          <button
            onClick={() => { setShowPwd(s => !s); setPwdMsg(null); }}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-yellow-400" />
              </div>
              <span className="font-semibold text-foreground text-sm">
                Change Password
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {showPwd ? 'Hide' : 'Show'}
            </span>
          </button>

          {showPwd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-5 space-y-4"
            >
              {/* Current Password */}
              <div className="relative">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={pwdForm.current}
                    onChange={e => setPwdForm(f => ({ ...f, current: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors pr-10"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNextPwd ? 'text' : 'password'}
                    value={pwdForm.next}
                    onChange={e => setPwdForm(f => ({ ...f, next: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNextPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showNextPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={pwdForm.confirm}
                  onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Confirm new password"
                />
              </div>

              {pwdMsg && (
                <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
                  pwdMsg.type === 'success'
                    ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                    : 'bg-red-500/15 text-red-400 border border-red-500/30'
                }`}>
                  {pwdMsg.text}
                </div>
              )}

              <button
                onClick={handlePasswordChange}
                disabled={pwdSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <KeyRound className="w-4 h-4" />
                {pwdSaving ? 'Updating...' : 'Update Password'}
              </button>
            </motion.div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}