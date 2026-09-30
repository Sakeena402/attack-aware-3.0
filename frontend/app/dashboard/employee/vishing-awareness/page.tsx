// frontend/app/dashboard/employee/vishing-awareness/page.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import {
  Phone, ShieldAlert, Clock, UserCheck, Lock, PhoneOff,
  AlertTriangle, CheckCircle2, ArrowRight, Info,
} from 'lucide-react';

// ── Content: the fake call, broken into lines. Some lines are "flagged" —
// clicking them reveals why that line is a red flag. ─────────────────────────
interface CallLine {
  speaker: 'caller' | 'you';
  text: string;
  flag?: string; // if present, this line is clickable and explains a red flag
}

const CALL_SCRIPT: CallLine[] = [
  { speaker: 'caller', text: "Hello, this is Daniyal calling from your company's IT Security team." },
  {
    speaker: 'caller',
    text: "We've detected suspicious login activity on your account from an unrecognized device.",
    flag: 'Creates urgency and fear — attackers want you reacting emotionally, not thinking carefully.',
  },
  {
    speaker: 'caller',
    text: "I'm calling from the security desk, so I just need to verify a few details to lock the account down before it's compromised.",
    flag: 'Impersonating authority — claiming to be IT/security makes you more likely to comply without question.',
  },
  { speaker: 'you', text: 'Oh no, okay — what do you need from me?' },
  {
    speaker: 'caller',
    text: "First, can you confirm your employee ID and the one-time code that was just sent to your phone?",
    flag: 'Requesting an OTP — no legitimate IT team will ever ask you to read back a one-time passcode over the phone.',
  },
  { speaker: 'you', text: "Uh, sure, one second..." },
  {
    speaker: 'caller',
    text: "We really need this in the next two minutes or the system will auto-lock your account for 48 hours.",
    flag: 'Artificial time pressure — a hard deadline stops you from pausing to verify who is really calling.',
  },
  {
    speaker: 'caller',
    text: "Also, while I have you — can you confirm your current password so I can check it against the breach list?",
    flag: 'Directly asking for a password — this is the single clearest sign of a scam. No real IT process needs your password.',
  },
];

const RED_FLAGS = [
  { icon: Clock,       title: 'Urgency & Pressure',        desc: 'Manufactured deadlines that discourage you from stopping to verify the request.' },
  { icon: UserCheck,   title: 'Authority Impersonation',   desc: 'Claiming to be IT, HR, a bank, or a senior executive to make you comply automatically.' },
  { icon: Lock,        title: 'Requests for Credentials',   desc: 'Asking for passwords, OTPs, PINs, or account numbers — legitimate teams never need these verbally.' },
  { icon: PhoneOff,    title: 'Unverifiable Caller',        desc: "Caller ID can be spoofed. You can't confirm who's really calling from the number alone." },
  { icon: AlertTriangle, title: 'Discourages Verification', desc: 'Getting defensive or evasive if you say you want to call back through official channels.' },
  { icon: ShieldAlert, title: 'Too Good / Too Bad to be True', desc: 'Either a scary threat (account locked) or a tempting reward — both bypass careful thinking.' },
];

export default function VishingAwarenessPage() {
  const router = useRouter();
  const [revealedFlag, setRevealedFlag] = useState<number | null>(null);
  const [viewedFlags, setViewedFlags] = useState<Set<number>>(new Set());

  const flagCount = CALL_SCRIPT.filter(l => l.flag).length;
  const allViewed = viewedFlags.size >= flagCount;

  const toggleFlag = (idx: number) => {
    setRevealedFlag(prev => (prev === idx ? null : idx));
    setViewedFlags(prev => new Set(prev).add(idx));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
          <Phone className="w-4 h-4" /> Security Awareness Training
        </div>
        <h1 className="text-3xl font-bold text-foreground">Understanding Vishing Attacks</h1>
        <p className="text-slate-400">
          A short module on how voice-phishing scams work, and how to spot them before they cost you.
        </p>
      </motion.div>

      {/* ── What is Vishing ── */}
      <Card className="p-6 surface-1 rounded-xl border border-purple-500/20 space-y-3">
        <h2 className="text-xl font-bold text-foreground">What Is Vishing?</h2>
        <p className="text-slate-300 text-sm leading-relaxed">
          <strong className="text-foreground">Vishing</strong> ("voice phishing") is a social engineering attack
          where a scammer calls you and pretends to be someone trustworthy — IT support, a bank representative,
          a senior manager, or a government official — to trick you into revealing sensitive information or
          taking a harmful action.
        </p>
        <p className="text-slate-300 text-sm leading-relaxed">
          Unlike email phishing, vishing relies on a live human voice, tone, and real-time pressure — which makes
          it feel more convincing and gives you less time to think. Attackers can even fake ("spoof") the caller ID
          to look like it's coming from inside your own company.
        </p>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 mt-2">
          <Info className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
          <p className="text-xs text-purple-200">
            Why it matters: a successful vishing call can hand an attacker your password, OTP, or access to
            systems that hold sensitive company or customer data — all without touching a single computer.
          </p>
        </div>
      </Card>

      {/* ── Realistic Example (interactive) ── */}
      <Card className="p-6 surface-1 rounded-xl border border-purple-500/20 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">A Realistic Vishing Call</h2>
          <p className="text-slate-400 text-sm mt-1">
            Tap any highlighted line to see why it's a warning sign. ({viewedFlags.size}/{flagCount} explored)
          </p>
        </div>

        <div className="space-y-3">
          {CALL_SCRIPT.map((line, idx) => {
            const isCaller = line.speaker === 'caller';
            const isFlagged = !!line.flag;
            const isOpen = revealedFlag === idx;
            const wasViewed = viewedFlags.has(idx);

            return (
              <div key={idx} className={`flex ${isCaller ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[85%]">
                  <button
                    disabled={!isFlagged}
                    onClick={() => isFlagged && toggleFlag(idx)}
                    className={`text-left px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all ${
                      isCaller
                        ? isFlagged
                          ? `bg-red-500/15 border ${wasViewed ? 'border-red-500/50' : 'border-red-500/30'} text-red-100 hover:bg-red-500/20 cursor-pointer`
                          : 'bg-slate-700/60 text-slate-200'
                        : 'bg-purple-500/20 text-purple-100 border border-purple-500/20'
                    }`}
                  >
                    <span className="flex items-start gap-2">
                      {isFlagged && (
                        <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${wasViewed ? 'text-red-400' : 'text-red-400 animate-pulse'}`} />
                      )}
                      {line.text}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isOpen && line.flag && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-1.5 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-200"
                      >
                        <strong>Red flag:</strong> {line.flag}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>

        {!allViewed && (
          <p className="text-xs text-slate-500 text-center pt-2">
            💡 Tip: explore all {flagCount} highlighted lines above before moving on.
          </p>
        )}
      </Card>

      {/* ── Red Flags Summary ── */}
      <Card className="p-6 surface-1 rounded-xl border border-purple-500/20 space-y-4">
        <h2 className="text-xl font-bold text-foreground">How to Spot Vishing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RED_FLAGS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/40 border border-slate-600/50">
              <div className="p-2 rounded-lg bg-red-500/15 shrink-0">
                <Icon className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
          <p className="text-xs text-green-200">
            <strong>What to do instead:</strong> hang up, and call the person or department back using a number
            you already know is correct (e.g. from the company directory) — never a number the caller gives you.
          </p>
        </div>
      </Card>

      {/* ── CTA to Quiz ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-6 surface-1 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-blue-500/5 text-center space-y-4">
          <h2 className="text-lg font-bold text-foreground">Ready to test what you've learned?</h2>
          <p className="text-slate-400 text-sm">
            A short 5-question quiz based on real workplace scenarios — see how well you can spot a vishing attempt.
          </p>
          <button
            onClick={() => router.push('/dashboard/quizzes/6f0000000000000000000001')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:shadow-lg transition"
          >
            Test Your Vishing Awareness
            <ArrowRight className="w-4 h-4" />
          </button>
        </Card>
      </motion.div>
    </div>
  );
}