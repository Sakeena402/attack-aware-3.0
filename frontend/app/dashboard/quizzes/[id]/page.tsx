'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { quizApi, QuizQuestion } from '@/app/services/quizApi';
import { Clock, Globe, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

const TIME_PER_QUESTION = 40;

export default function QuizAttemptPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [phase,    setPhase]    = useState<'rules' | 'quiz' | 'result'>('rules');
  const [lang,     setLang]     = useState<'en' | 'ur'>('en');
  const [current,  setCurrent]  = useState(0);
  const [answers,  setAnswers]  = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [correct,  setCorrect]  = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [timeLine, setTimeLine] = useState(0);
  const [score,    setScore]    = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result,   setResult]   = useState<any>(null);

  const { data: questions = [], isLoading } = useSWR<QuizQuestion[]>(
    phase !== 'rules' ? `quiz-questions:${id}` : null,
    () => quizApi.getQuestions(id),
    { revalidateOnFocus: false }
  );

  const q = questions[current];
  const isUrdu = lang === 'ur';
  const totalQ = questions.length;

  // Timer
  useEffect(() => {
    if (phase !== 'quiz' || selected !== null) return;
    if (timeLeft <= 0) { handleTimeout(); return; }

    const t = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
      setTimeLine(prev => prev + (100 / TIME_PER_QUESTION));
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, selected]);

  const handleTimeout = useCallback(() => {
    if (!q) return;
    setSelected('__timeout__');
    setCorrect(q.correctOption);
    setTimeout(moveNext, 1500);
  }, [q]);

  const handleSelect = (opt: 'a' | 'b' | 'c' | 'd') => {
    if (selected) return;
    setSelected(opt);
    setCorrect(q.correctOption);
    const newAnswers = { ...answers, [q._id]: opt };
    setAnswers(newAnswers);
    if (opt === q.correctOption) setScore(s => s + 1);
    setTimeout(moveNext, 1200);
  };

  const moveNext = () => {
    if (current < totalQ - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setCorrect(null);
      setTimeLeft(TIME_PER_QUESTION);
      setTimeLine(0);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await quizApi.submit(id, answers);
      setResult(res);
      setPhase('result');
    } finally {
      setSubmitting(false);
    }
  };

  const optionLabel = (opt: 'a' | 'b' | 'c' | 'd') =>
    isUrdu && q[`option_${opt}_ur` as keyof QuizQuestion]
      ? q[`option_${opt}_ur` as keyof QuizQuestion] as string
      : q[`option_${opt}` as keyof QuizQuestion] as string;

  const optionClass = (opt: 'a' | 'b' | 'c' | 'd') => {
    if (!selected) return 'bg-slate-700/50 border-slate-600 hover:border-purple-500/50 hover:bg-slate-700 cursor-pointer';
    if (opt === correct) return 'bg-green-500/20 border-green-500 text-green-300';
    if (opt === selected && opt !== correct) return 'bg-red-500/20 border-red-500 text-red-300';
    return 'bg-slate-700/30 border-slate-700 opacity-50';
  };

  if (isLoading && phase !== 'rules') {
    return <div className="h-64 bg-slate-700 rounded-xl animate-pulse" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition">
        <ArrowLeft className="w-4 h-4" /> Back to Quizzes
      </button>

      <AnimatePresence mode="wait">

        {/* ── RULES PHASE ── */}
        {phase === 'rules' && (
          <motion.div key="rules" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card className="p-8 surface-1 rounded-xl border border-purple-500/20 text-center space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Quiz Rules</h1>
                <p className="text-slate-400 text-sm">Read these rules before starting</p>
              </div>

              <div className="text-left space-y-3">
                {[
                  `You have ${TIME_PER_QUESTION} seconds for each question`,
                  'Once you choose an answer, you cannot change it',
                  'When time runs out, the correct answer is shown',
                  'You earn points for each correct answer',
                  'Score ≥ 70% = Pass (+20 pts) | Below 70% = +5 pts',
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30">
                    <span className="text-purple-400 font-bold text-sm shrink-0">{i + 1}.</span>
                    <p className="text-slate-300 text-sm">{rule}</p>
                  </div>
                ))}
              </div>

              {/* Language toggle */}
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm text-slate-400">Language:</span>
                <button
                  onClick={() => setLang(isUrdu ? 'en' : 'ur')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:text-white text-sm transition"
                >
                  <Globe className="w-4 h-4" />
                  {isUrdu ? 'Switch to English' : 'اردو میں دیکھیں'}
                </button>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.back()}
                  className="px-6 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition text-sm"
                >
                  Exit
                </button>
                <button
                  onClick={() => setPhase('quiz')}
                  className="px-8 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:shadow-lg transition text-sm"
                >
                  {isUrdu ? 'کوئز شروع کریں' : 'Start Quiz'}
                </button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── QUIZ PHASE ── */}
        {phase === 'quiz' && q && (
          <motion.div key={`q-${current}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Question {current + 1} / {totalQ}
              </span>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold ${
                timeLeft <= 10 ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'
              }`}>
                <Clock className="w-4 h-4" />
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>

            {/* Timer bar */}
            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(0, 100 - timeLine)}%`,
                  background: timeLeft <= 10 ? '#ef4444' : '#8b5cf6',
                }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Question card */}
            <Card className="p-6 surface-1 rounded-xl border border-purple-500/20">
              <p
                className="text-lg font-medium text-foreground mb-6 leading-relaxed"
                dir={isUrdu ? 'rtl' : 'ltr'}
              >
                {isUrdu && q.question_ur ? q.question_ur : q.question}
              </p>

              <div className="space-y-3">
                {(['a', 'b', 'c', 'd'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    disabled={!!selected}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${optionClass(opt)}`}
                    dir={isUrdu ? 'rtl' : 'ltr'}
                  >
                    <span className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                      {opt}
                    </span>
                    <span className="text-sm flex-1">{optionLabel(opt)}</span>
                    {selected && opt === correct && <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />}
                    {selected && opt === selected && opt !== correct && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </Card>

            {/* Progress dots */}
            <div className="flex gap-1.5 justify-center flex-wrap">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < current ? 'bg-purple-500' :
                    i === current ? 'bg-white w-3' :
                    'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── RESULT PHASE ── */}
        {phase === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
            <Card className="p-8 surface-1 rounded-xl border border-purple-500/20 space-y-5">

              {result?.passed ? (
                <div className="text-6xl">🏆</div>
              ) : (
                <div className="text-6xl">📚</div>
              )}

              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {result?.passed ? 'Quiz Passed!' : "Keep Learning!"}
                </h2>
                <p className="text-slate-400 text-sm mt-1">You've completed the quiz</p>
              </div>

              {/* Score circle */}
              <div className={`w-32 h-32 mx-auto rounded-full flex flex-col items-center justify-center border-4 ${
                result?.passed ? 'border-green-500 bg-green-500/10' : 'border-orange-500 bg-orange-500/10'
              }`}>
                <span className={`text-3xl font-bold ${result?.passed ? 'text-green-400' : 'text-orange-400'}`}>
                  {totalQ > 0 ? Math.round((score / totalQ) * 100) : 0}%
                </span>
                <span className="text-xs text-slate-400 mt-1">{score}/{totalQ}</span>
              </div>

              {/* Points */}
              <div className={`p-4 rounded-xl ${
                result?.passed ? 'bg-green-500/10 border border-green-500/20' : 'bg-slate-700/50'
              }`}>
                <p className={`font-medium ${result?.passed ? 'text-green-400' : 'text-slate-300'}`}>
                  {result?.passed
                    ? `+${result?.pointsEarned ?? 20} points earned! 🎉`
                    : `+${result?.pointsEarned ?? 5} points for attempting`
                  }
                </p>
                {!result?.passed && (
                  <p className="text-xs text-slate-400 mt-1">Need 70% to pass. Keep practicing!</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.push('/dashboard/quizzes')}
                  className="px-6 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition text-sm"
                >
                  All Quizzes
                </button>
                <button
                  onClick={() => {
                    setPhase('rules');
                    setCurrent(0);
                    setAnswers({});
                    setSelected(null);
                    setCorrect(null);
                    setScore(0);
                    setTimeLeft(TIME_PER_QUESTION);
                    setTimeLine(0);
                    setResult(null);
                  }}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}