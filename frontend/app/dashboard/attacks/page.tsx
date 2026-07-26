'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR, { mutate } from 'swr';
import { useAuth } from '@/app/context/authContext';
import { Card } from '@/components/ui/card';
import { attacksApi, Attack, CreateAttackPayload } from '@/app/services/attacksApi';
import {
  ShieldAlert, Plus, X, Check,
  AlertTriangle, AlertOctagon, Info, ShieldCheck,
  ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Severity Config ───────────────────────────────────────────────────────────

const SEVERITY = {
  critical: {
    label: 'Critical',
    icon: AlertOctagon,
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  high: {
    label: 'High',
    icon: AlertTriangle,
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  medium: {
    label: 'Medium',
    icon: Info,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/30',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  low: {
    label: 'Low',
    icon: ShieldCheck,
    color: 'text-green-400',
    bg: 'bg-green-500/15',
    border: 'border-green-500/30',
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
} as const;

// ── Attack Card ───────────────────────────────────────────────────────────────

function AttackCard({ attack }: { attack: Attack }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY[attack.severity];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <Card className={`bg-slate-800/60 border-slate-700/50 hover:${cfg.border} transition-colors overflow-hidden`}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            {/* Icon + Info */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground text-sm">
                    {attack.name}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
                {attack.description && (
                  <p className={`text-xs text-muted-foreground mt-1 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
                    {attack.description}
                  </p>
                )}
              </div>
            </div>

            {/* Expand toggle */}
            {attack.description && attack.description.length > 100 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 mt-1"
              >
                {expanded
                  ? <ChevronUp className="w-4 h-4" />
                  : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ── Add Attack Form (super_admin only) ────────────────────────────────────────

function AddAttackForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<CreateAttackPayload>({
    name: '',
    description: '',
    severity: 'medium',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await attacksApi.create(form);
      mutate('attacks');
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create attack.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="bg-slate-800/60 border-slate-700/50 p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" />
            Add New Attack Type
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Name */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">
              Attack Name
            </label>
            <input
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g. Spear Phishing"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Severity */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">
              Severity
            </label>
            <select
              value={form.severity}
              onChange={e => setForm(f => ({ ...f, severity: e.target.value as any }))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">
              Description
            </label>
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              placeholder="Describe the attack type..."
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Attack'}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AttacksPage() {
  const { state }       = useAuth();
  const isSuperAdmin    = state.user?.role === 'super_admin';
  const [showForm, setShowForm]   = useState(false);
  const [filter, setFilter]       = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  const { data: attacks = [], isLoading } = useSWR<Attack[]>(
    'attacks',
    () => attacksApi.getAll(),
    { revalidateOnFocus: false }
  );

  const filtered = filter === 'all'
    ? attacks
    : attacks.filter(a => a.severity === filter);

  const counts = {
    critical: attacks.filter(a => a.severity === 'critical').length,
    high:     attacks.filter(a => a.severity === 'high').length,
    medium:   attacks.filter(a => a.severity === 'medium').length,
    low:      attacks.filter(a => a.severity === 'low').length,
  };

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-400" />
            Attacks Catalog
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Learn about common cyber attack types and how to stay protected
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Attack
          </button>
        )}
      </motion.div>

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <AddAttackForm onClose={() => setShowForm(false)} />
        )}
      </AnimatePresence>

      {/* Severity Filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap gap-2"
      >
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${
              filter === f
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {f === 'all' ? `All (${attacks.length})` : `${f} (${counts[f]})`}
          </button>
        ))}
      </motion.div>

      {/* Attacks List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="h-20 bg-slate-800/40 border-slate-700/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-800/40 border-slate-700/50 p-12 text-center">
          <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No attacks found</p>
          <p className="text-slate-500 text-sm mt-1">
            {isSuperAdmin ? 'Add your first attack type above.' : 'Check back later.'}
          </p>
        </Card>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map(attack => (
              <AttackCard key={attack._id} attack={attack} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}