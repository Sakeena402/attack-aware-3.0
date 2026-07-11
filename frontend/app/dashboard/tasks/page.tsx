'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useAuth } from '@/app/context/authContext';
import { useRouter } from 'next/navigation';
import { apiService } from '@/app/services/api';
import { Card } from '@/components/ui/card';
import {
  PlayCircle, Brain, Gamepad2, AlertTriangle,
  MessageSquare, Wrench, ChevronRight, Languages,
  ClipboardList, Clock, CheckCircle2, Circle,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  assignedBy: string;
  createdAt: string;
}

// ── Quick Access Cards ────────────────────────────────────────────────────────

const QUICK_ACCESS = [
  {
    icon: PlayCircle,
    title: 'Awareness Videos',
    title_ur: 'آگاہی ویڈیوز',
    btn: 'Watch',
    btn_ur: 'دیکھیں',
    href: '/dashboard/videos',
    color: 'from-green-500/20 to-green-600/10',
    iconColor: 'text-green-400',
    border: 'hover:border-green-500/50',
  },
  {
    icon: Brain,
    title: 'Interactive Quizzes',
    title_ur: 'انٹرایکٹو کوئز',
    btn: 'Take Quiz',
    btn_ur: 'کوئز شروع کریں',
    href: '/dashboard/quizzes',
    color: 'from-blue-500/20 to-blue-600/10',
    iconColor: 'text-blue-400',
    border: 'hover:border-blue-500/50',
  },
  {
    icon: Gamepad2,
    title: 'Cyber Games',
    title_ur: 'سائبر گیمز',
    btn: 'Play',
    btn_ur: 'کھیلیں',
    href: '/dashboard/games',
    color: 'from-purple-500/20 to-purple-600/10',
    iconColor: 'text-purple-400',
    border: 'hover:border-purple-500/50',
  },
  {
    icon: AlertTriangle,
    title: 'Threat Alerts',
    title_ur: 'خطرے کے انتباہات',
    btn: 'View',
    btn_ur: 'دیکھیں',
    href: '/dashboard/attacks',
    color: 'from-red-500/20 to-red-600/10',
    iconColor: 'text-red-400',
    border: 'hover:border-red-500/50',
  },
  {
    icon: MessageSquare,
    title: 'Discussion Forum',
    title_ur: 'کمیونٹی فورم',
    btn: 'Join',
    btn_ur: 'شامل ہوں',
    href: '/dashboard/forum',
    color: 'from-indigo-500/20 to-indigo-600/10',
    iconColor: 'text-indigo-400',
    border: 'hover:border-indigo-500/50',
  },
  {
    icon: Wrench,
    title: 'Cyber Tools',
    title_ur: 'سائبر ٹولز',
    btn: 'Access',
    btn_ur: 'استعمال کریں',
    href: '/dashboard/attacks',
    color: 'from-orange-500/20 to-orange-600/10',
    iconColor: 'text-orange-400',
    border: 'hover:border-orange-500/50',
  },
];

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, isUrdu }: { status: Task['status']; isUrdu: boolean }) {
  const config = {
    pending: {
      icon: Circle,
      label: isUrdu ? 'زیر التواء' : 'Pending',
      class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    },
    in_progress: {
      icon: Clock,
      label: isUrdu ? 'جاری ہے' : 'In Progress',
      class: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    completed: {
      icon: CheckCircle2,
      label: isUrdu ? 'مکمل' : 'Completed',
      class: 'bg-green-500/20 text-green-400 border-green-500/30',
    },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.class}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { state }      = useAuth();
  const router         = useRouter();
  const [isUrdu, setIsUrdu] = useState(false);

  const name = state.user?.name ?? 'Employee';

  // Fetch assigned tasks from backend
  const { data: tasks = [], isLoading } = useSWR<Task[]>(
    state.user?.id ? ['tasks', state.user.id] : null,
    () => apiService.get<Task[]>('/tasks').then(r =>
      Array.isArray(r.data) ? r.data : []
    ),
    { revalidateOnFocus: false }
  );

  const pendingCount   = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isUrdu ? `خوش آمدید، ${name} 👋` : `Welcome, ${name} 👋`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isUrdu
              ? 'اپنی سائبر سیکیورٹی تربیت اور کام جاری رکھیں'
              : 'Continue your cybersecurity training and assigned tasks'}
          </p>
        </div>
        <button
          onClick={() => setIsUrdu(u => !u)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-blue-500/50 text-sm text-slate-300 transition-colors shrink-0"
        >
          <Languages className="w-4 h-4 text-blue-400" />
          {isUrdu ? 'Switch to English' : 'اردو میں دیکھیں'}
        </button>
      </motion.div>

      {/* Assigned Tasks Section */}
      {(isLoading || tasks.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-foreground">
              {isUrdu ? 'تفویض کردہ کام' : 'Assigned Tasks'}
            </h2>
            {/* Stats */}
            <div className="flex gap-2 ml-auto text-xs">
              <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
                {pendingCount} {isUrdu ? 'زیر التواء' : 'pending'}
              </span>
              <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                {inProgressCount} {isUrdu ? 'جاری' : 'in progress'}
              </span>
              <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                {completedCount} {isUrdu ? 'مکمل' : 'done'}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <Card key={i} className="h-20 bg-slate-800/40 border-slate-700/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, i) => (
                <motion.div
                  key={task._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="bg-slate-800/60 border-slate-700/50 hover:border-blue-500/30 transition-colors p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        {task.dueDate && (
                          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {isUrdu ? 'ڈیڈ لائن:' : 'Due:'}{' '}
                            {new Date(task.dueDate).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={task.status} isUrdu={isUrdu} />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Access Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-400" />
          {isUrdu ? 'فوری رسائی' : 'Quick Access'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_ACCESS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Card
                  className={`
                    bg-gradient-to-br ${item.color}
                    border-slate-700/50 ${item.border}
                    transition-all duration-300 cursor-pointer
                    hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20
                    p-5 flex flex-col items-center text-center gap-3
                  `}
                  onClick={() => router.push(item.href)}
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center">
                    <Icon className={`w-6 h-6 ${item.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {isUrdu ? item.title_ur : item.title}
                  </h3>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${item.iconColor}`}>
                    {isUrdu ? item.btn_ur : item.btn}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}