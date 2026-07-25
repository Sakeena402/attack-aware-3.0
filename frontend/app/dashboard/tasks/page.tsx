'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useAuth } from '@/app/context/authContext';
import { apiService } from '@/app/services/api';
import { Card } from '@/components/ui/card';
import {
  ClipboardList, Clock, CheckCircle2,
  Circle, Languages, Inbox,
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
  const { state } = useAuth();
  const [isUrdu, setIsUrdu] = useState(false);

  const { data: tasks = [], isLoading } = useSWR<Task[]>(
    state.user?.id ? ['tasks', state.user.id] : null,
    () => apiService.get<Task[]>('/tasks').then(r =>
      Array.isArray(r.data) ? r.data : []
    ),
    { revalidateOnFocus: false }
  );

  const pendingCount    = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount  = tasks.filter(t => t.status === 'completed').length;

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
            <ClipboardList className="w-6 h-6 text-blue-400" />
            {isUrdu ? 'میرے کام' : 'My Tasks'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isUrdu
              ? 'آپ کے ایڈمن کی طرف سے تفویض کردہ کام'
              : 'Tasks assigned to you by your admin'}
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

      {/* Stats */}
      {tasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-3 flex-wrap"
        >
          <span className="px-3 py-1.5 rounded-xl bg-yellow-500/20 text-yellow-400 text-xs font-semibold border border-yellow-500/30">
            {pendingCount} {isUrdu ? 'زیر التواء' : 'Pending'}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">
            {inProgressCount} {isUrdu ? 'جاری' : 'In Progress'}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-green-500/20 text-green-400 text-xs font-semibold border border-green-500/30">
            {completedCount} {isUrdu ? 'مکمل' : 'Completed'}
          </span>
        </motion.div>
      )}

      {/* Tasks List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-20 bg-slate-800/40 border-slate-700/50 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card className="bg-slate-800/40 border-slate-700/50 p-12 text-center">
          <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">
            {isUrdu ? 'ابھی کوئی کام نہیں' : 'No tasks assigned yet'}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {isUrdu
              ? 'آپ کا ایڈمن جلد کام تفویض کرے گا'
              : 'Your admin will assign tasks soon'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, i) => (
            <motion.div
              key={task._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-slate-800/60 border-slate-700/50 hover:border-blue-500/30 transition-colors p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                    {task.dueDate && (
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
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
    </div>
  );
}