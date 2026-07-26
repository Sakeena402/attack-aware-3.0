'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { getVideos, StaticVideo } from '@/app/data/videos.data';
import { videoApi } from '@/app/services/videoApi';
import { Play, Lock, CheckCircle, Globe } from 'lucide-react';

const CATEGORIES = [
  'All',
  'Phishing Awareness',
  'Password Security',
  'Ransomware',
  'Online Scams',
  'Mobile Security',
  'WiFi Security',
];

export default function VideosPage() {
  const router = useRouter();
  const [lang, setLang]         = useState<'en' | 'ur'>('en');
  const [category, setCategory] = useState('');

  // Static data — instant, no loading state, no backend call
  const videos: StaticVideo[] = getVideos(lang, category || undefined);

  // Real completion status from backend
  const { data: watched = [] } = useSWR('watched-videos', () => videoApi.getMyWatched(), {
    revalidateOnFocus: true,
  });
  const watchedIds = new Set(watched.map(w => w.videoId));

  return (
    <div className="space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {lang === 'ur' ? 'سائبر آگاہی ویڈیوز' : 'Security Awareness Videos'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {lang === 'ur'
                ? 'سائبر حملوں سے بچاؤ کے لیے ویڈیوز دیکھیں'
                : 'Watch videos to learn how to protect yourself from cyber attacks'}
            </p>
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-purple-500/20 text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            <Globe className="w-4 h-4" />
            {lang === 'en' ? 'اردو میں دیکھیں' : 'Watch in English'}
          </button>
        </div>
      </motion.div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat === 'All' ? '' : cat)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              (cat === 'All' && !category) || category === cat
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground border border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Video Grid */}
      {videos.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Play className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p>No videos available yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((video, i) => {
            const isCompleted = watchedIds.has(video._id);
            return (
              <motion.div
                key={video._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={`rounded-xl border overflow-hidden transition-all duration-300 ${
                    video.isLocked
                      ? 'border-slate-700 opacity-75 cursor-not-allowed'
                      : 'border-purple-500/20 hover:border-purple-500/50 cursor-pointer hover:-translate-y-1'
                  }`}
                  onClick={() => !video.isLocked && router.push(`/dashboard/videos/${video._id}`)}
                >
                  {/* Thumbnail */}
                  <div className="relative h-44 bg-slate-800">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-slate-800">
                        <Play className="w-12 h-12 text-purple-400" />
                      </div>
                    )}

                    {/* Overlay badges */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {video.isLocked ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 rounded-full bg-black/60">
                            <Lock className="w-6 h-6 text-yellow-400" />
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); router.push('/dashboard/subscribe'); }}
                            className="px-3 py-1 rounded-full bg-yellow-400 text-black text-xs font-bold"
                          >
                            👑 Upgrade to Watch
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Completed badge */}
                    {isCompleted && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-medium">
                        <CheckCircle className="w-3 h-3" /> Completed
                      </div>
                    )}

                    {/* Language badge */}
                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      video.language === 'ur'
                        ? 'bg-green-500/80 text-white'
                        : 'bg-blue-500/80 text-white'
                    }`}>
                      {video.language === 'ur' ? 'اردو' : 'English'}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3
                      className="font-semibold text-foreground text-sm leading-snug"
                      dir={video.language === 'ur' ? 'rtl' : 'ltr'}
                    >
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-slate-400">{video.category}</span>
                      {!video.isLocked && !isCompleted && (
                        <span className="text-xs text-purple-400">+10 pts on completion</span>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}