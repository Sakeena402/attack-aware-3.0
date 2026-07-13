'use client';

import { useState } from 'react';
import type React from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/app/context/authContext';
import { apiService } from '@/app/services/api';
import {
  TrendingUp, Gamepad2, Video, Brain,
  CheckCircle, Clock, Trophy, Languages,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GameLog {
  game_title: string;
  score: number;
  played_at: string;
}

interface QuizLog {
  quiz_title: string;
  score: number;
  attempted_at: string;
}

interface VideoLog {
  video_id: string;
  status: string;
  watched_at: string;
}

interface ProgressData {
  points: number;
  badge: string;
  riskScore: number;
  riskLevel: string;
  videosCompleted: number;
  quizzesTaken: number;
  gamesPlayed: number;
  history: {
    games: GameLog[];
    quizzes: QuizLog[];
    videos: VideoLog[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function isCompleted(status: string) {
  return ['complete', 'completed', 'done', 'watched'].includes(
    status.toLowerCase().trim()
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="bg-slate-800/60 border-slate-700/50 p-5">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              {label}
            </p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ── Log Table ─────────────────────────────────────────────────────────────────

function LogTable({
  title,
  icon: Icon,
  iconColor,
  headers,
  rows,
  emptyMsg,
  isUrdu,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
  emptyMsg: string;
  isUrdu: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-3">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {rows.length} {isUrdu ? 'ریکارڈ' : 'records'}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">{emptyMsg}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    {headers.map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20 transition-colors"
                    >
                      {row.map((cell, j) => (
  <td key={j} className="px-5 py-3 text-slate-300">
    {cell as React.ReactNode}
  </td>
))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length > 5 && (
              <div className="px-5 py-3 border-t border-slate-700/50">
                <button
                  onClick={() => setShowAll(s => !s)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  {showAll
                    ? (isUrdu ? 'کم دیکھیں' : 'Show Less')
                    : (isUrdu ? `مزید ${rows.length - 5} دیکھیں` : `See ${rows.length - 5} more`)}
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const { state } = useAuth();
  const [isUrdu, setIsUrdu] = useState(false);

  const { data, isLoading } = useSWR<ProgressData>(
    state.user?.id ? ['progress', state.user.id] : null,
    () => apiService.get<ProgressData>('/progress').then(r => r.data),
    { revalidateOnFocus: false }
  );

 const games   = data?.history?.games   ?? [];
const quizzes = data?.history?.quizzes ?? [];
const videos  = data?.history?.videos  ?? [];

  // Stats
  const avgGame  = avg(games.map(g => g.score));
  const avgQuiz  = avg(quizzes.map(q => q.score));
  const completed = videos.filter(v => isCompleted(v.status)).length;
  const videoPct  = videos.length
    ? Math.round((completed / videos.length) * 100)
    : 0;

  // Table rows
  const gameRows   = games.map(g   => [g.game_title,  g.score,  formatDate(g.played_at)]);
  const quizRows   = quizzes.map(q => [q.quiz_title,  q.score,  formatDate(q.attempted_at)]);
  const videoRows  = videos.map(v  => [
    v.video_id,
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      isCompleted(v.status)
        ? 'bg-green-500/20 text-green-400'
        : 'bg-yellow-500/20 text-yellow-400'
    }`}>
      {isCompleted(v.status)
        ? <><CheckCircle className="w-3 h-3" />{isUrdu ? 'مکمل' : 'Completed'}</>
        : <><Clock className="w-3 h-3" />{isUrdu ? 'نامکمل' : 'Incomplete'}</>}
    </span>,
    formatDate(v.watched_at),
  ]);

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
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            {isUrdu ? 'میری ترقی کا ڈیش بورڈ' : 'My Progress Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isUrdu
              ? 'اپنی تعلیمی سرگرمی اور اسکور ٹریک کریں'
              : 'Track your learning activity and scores'}
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

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-24 bg-slate-800/40 border-slate-700/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Gamepad2}
            label={isUrdu ? 'اوسط کھیل سکور' : 'Avg Game Score'}
            value={avgGame}
            sub={`${games.length} ${isUrdu ? 'کھیل' : 'games played'}`}
            color="bg-purple-600"
            delay={0}
          />
          <StatCard
            icon={Brain}
            label={isUrdu ? 'اوسط کوئز سکور' : 'Avg Quiz Score'}
            value={avgQuiz}
            sub={`${quizzes.length} ${isUrdu ? 'کوئز' : 'quizzes taken'}`}
            color="bg-blue-600"
            delay={0.05}
          />
          <StatCard
            icon={Video}
            label={isUrdu ? 'ویڈیوز دیکھی گئی' : 'Videos Watched'}
            value={`${videoPct}%`}
            sub={`${completed}/${videos.length} ${isUrdu ? 'مکمل' : 'completed'}`}
            color="bg-green-600"
            delay={0.1}
          />
        </div>
      )}

      {/* Log Tables */}
      {!isLoading && (
        <div className="space-y-4">
          <LogTable
            title={isUrdu ? 'کھیل کے ریکارڈ' : 'Game Logs'}
            icon={Gamepad2}
            iconColor="text-purple-400"
            headers={isUrdu
              ? ['کھیل کا نام', 'سکور', 'تاریخ']
              : ['Game', 'Score', 'Date']}
            rows={gameRows}
            emptyMsg={isUrdu ? 'ابھی کوئی کھیل نہیں کھیلا' : 'No games played yet'}
            isUrdu={isUrdu}
          />
          <LogTable
            title={isUrdu ? 'کوئز کے ریکارڈ' : 'Quiz Logs'}
            icon={Brain}
            iconColor="text-blue-400"
            headers={isUrdu
              ? ['کوئز کا نام', 'سکور', 'تاریخ']
              : ['Quiz', 'Score', 'Date']}
            rows={quizRows}
            emptyMsg={isUrdu ? 'ابھی کوئی کوئز نہیں لیا' : 'No quizzes taken yet'}
            isUrdu={isUrdu}
          />
          <LogTable
            title={isUrdu ? 'ویڈیو کے ریکارڈ' : 'Video Logs'}
            icon={Video}
            iconColor="text-green-400"
            headers={isUrdu
              ? ['ویڈیو', 'حالت', 'تاریخ']
              : ['Video', 'Status', 'Date']}
            rows={videoRows}
            emptyMsg={isUrdu ? 'ابھی کوئی ویڈیو نہیں دیکھی' : 'No videos watched yet'}
            isUrdu={isUrdu}
          />
        </div>
      )}
    </div>
  );
}