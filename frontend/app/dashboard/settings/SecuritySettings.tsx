"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { authApi } from "@/app/services/authApi";
import { ApiError } from "@/app/services/api";

export default function SecuritySettings({ settings, onUpdate }: any) {
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // ── 2FA enable flow (Phase 1: send OTP → Phase 2: verify OTP) ──────────────
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // ── 2FA disable flow (requires current password) ───────────────────────────
  const [disableStep, setDisableStep] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);

  const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof ApiError ? err.message || fallback : fallback;

  // Toggle click routes to the right flow depending on current state —
  // it never flips the setting directly, since both directions need
  // server-side confirmation (OTP to enable, password to disable).
  const handleToggleClick = () => {
    if (settings.twoFactorAuth) {
      setDisableStep(true);
      setDisablePassword("");
    } else {
      void startEnable2FA();
    }
  };

  const startEnable2FA = async () => {
    setIsSendingOtp(true);
    try {
      await authApi.toggle2FA({ enable: true });
      setOtpStep(true);
      toast.success("Verification code sent to your email.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to send verification code."));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyEnable2FA = async () => {
    if (otpCode.length !== 6) return;
    setIsVerifyingOtp(true);
    try {
      await authApi.toggle2FA({ enable: true, code: otpCode });
      onUpdate({ twoFactorAuth: true });
      setOtpStep(false);
      setOtpCode("");
      toast.success("Two-factor authentication enabled! ✅");
    } catch (err) {
      toast.error(getErrorMessage(err, "Incorrect or expired code."));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const cancelEnable2FA = () => {
    setOtpStep(false);
    setOtpCode("");
  };

  const confirmDisable2FA = async () => {
    if (!disablePassword) {
      toast.error("Please enter your current password");
      return;
    }
    setIsDisabling(true);
    try {
      await authApi.toggle2FA({ enable: false, password: disablePassword });
      onUpdate({ twoFactorAuth: false });
      setDisableStep(false);
      setDisablePassword("");
      toast.success("Two-factor authentication disabled.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Incorrect password."));
    } finally {
      setIsDisabling(false);
    }
  };

  const cancelDisable2FA = () => {
    setDisableStep(false);
    setDisablePassword("");
  };

  const savePasswordChange = async () => {
    if (!password) return; // nothing to save on this form besides password
    setSaving(true);
    try {
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
      toast.success("Password updated! ✅");
    } catch (err: any) {
      toast.error(err?.message || "Failed to change password! ❌");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0f1117] border border-gray-700 rounded-xl p-6 space-y-5">
      <h2 className="text-xl font-semibold">Security</h2>

      {/* 2FA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span>Two-Factor Authentication</span>
            <p className="text-xs text-gray-500 mt-0.5">
              {settings.twoFactorAuth
                ? "Enabled — a code is emailed to you at every login."
                : "Disabled — only your password is required at login."}
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.twoFactorAuth || false}
            onChange={handleToggleClick}
            disabled={isSendingOtp || otpStep || disableStep}
          />
        </div>

        {/* ── Enable: OTP verification ───────────────────────────────────── */}
        {otpStep && (
          <div className="bg-[#1a1d2e] border border-gray-600 rounded-lg p-4 space-y-3">
            <p className="text-sm text-gray-300">
              Enter the 6-digit code we emailed you to finish enabling 2FA.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full bg-[#0f1117] border border-gray-600 rounded-lg px-4 py-2 text-center text-xl tracking-[0.4em] text-white focus:outline-none focus:border-purple-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={verifyEnable2FA}
                disabled={isVerifyingOtp || otpCode.length !== 6}
                className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              >
                {isVerifyingOtp ? "Verifying..." : "Verify & Enable"}
              </button>
              <button
                onClick={cancelEnable2FA}
                disabled={isVerifyingOtp}
                className="px-4 py-2 rounded-lg font-medium text-gray-400 hover:text-white transition-all"
              >
                Cancel
              </button>
            </div>
            <button
              onClick={startEnable2FA}
              disabled={isSendingOtp}
              className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
            >
              {isSendingOtp ? "Sending..." : "Resend code"}
            </button>
          </div>
        )}

        {/* ── Disable: password confirmation ─────────────────────────────── */}
        {disableStep && (
          <div className="bg-[#1a1d2e] border border-gray-600 rounded-lg p-4 space-y-3">
            <p className="text-sm text-gray-300">
              Enter your current password to turn off two-factor authentication.
            </p>
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Current Password"
              className="w-full bg-[#0f1117] border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={confirmDisable2FA}
                disabled={isDisabling || !disablePassword}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              >
                {isDisabling ? "Disabling..." : "Disable 2FA"}
              </button>
              <button
                onClick={cancelDisable2FA}
                disabled={isDisabling}
                className="px-4 py-2 rounded-lg font-medium text-gray-400 hover:text-white transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
        onClick={savePasswordChange}
        disabled={saving || !password}
        className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50"
      >
        {saving ? "Saving..." : "Change Password"}
      </button>
    </div>
  );
}