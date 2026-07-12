'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { getVideoById, getVideos, StaticVideo } from '@/app/data/videos.data';
import { ArrowLeft, CheckCircle, SkipBack, SkipForward, Play, Pause } from 'lucide-react';

const COMPLETED_KEY = 'completedVideos';

function getCompletedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
  } catch {
    return [];
  }
}

function markCompletedLocally(id: string) {
  const ids = getCompletedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(ids));
  }
}

export default function VideoWatchPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [completed, setCompleted] = useState(false);
  const [marking,   setMarking]   = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Static data — instant, synchronous
  const video: StaticVideo | undefined = getVideoById(id);
  const allVideos: StaticVideo[] = video ? getVideos(video.language) : [];

  // Check localStorage for completion status on mount
  useEffect(() => {
    if (id && getCompletedIds().includes(id)) {
      setCompleted(true);
    }
  }, [id]);

  const handleComplete = async () => {
    if (completed || marking) return;
    setMarking(true);
    // No backend — persist completion locally instead
    markCompletedLocally(id);
    setCompleted(true);
    setMarking(false);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds)
    );
  };

  const isUrdu = video?.language === 'ur';

  if (!video) return <p className="text-slate-400">Video not found</p>;

  return (
    <div className="space-y-6">

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Videos
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Player */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-2 surface-1 rounded-xl border border-purple-500/20 overflow-hidden">
            {/* Video */}
            <div className="relative bg-black rounded-lg overflow-hidden group">
              <video
                ref={videoRef}
                className="w-full aspect-video"
                src={video.filePath}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={handleComplete}
              />

              {/* Custom controls overlay */}
              <div className="absolute inset-0 flex items-center justify-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                <button
                  onClick={() => skip(-10)}
                  className="p-3 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="p-4 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                <button
                  onClick={() => skip(10)}
                  className="p-3 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
            </div>
          </Card>

          {/* Title + info */}
          <div>
            <h1
              className="text-xl font-bold text-foreground"
              dir={isUrdu ? 'rtl' : 'ltr'}
            >
              {video.title}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs text-slate-400">{video.category}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                isUrdu ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {isUrdu ? 'اردو' : 'English'}
              </span>
            </div>
          </div>

          {/* Complete button */}
          <div>
            {completed ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  {isUrdu ? 'ویڈیو مکمل ہو گئی! +10 پوائنٹس' : 'Video completed! +10 points earned.'}
                </span>
              </div>
            ) : (
              <button
                onClick={handleComplete}
                disabled={marking}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/25 transition disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {marking
                  ? 'Saving...'
                  : isUrdu ? 'مکمل کریں (+10 پوائنٹس)' : 'Mark as Complete (+10 pts)'
                }
              </button>
            )}
          </div>
        </div>

        {/* Sidebar playlist */}
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">
            {isUrdu ? 'مزید ویڈیوز' : 'More Videos'}
          </h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {allVideos.map(v => {
              const vCompleted = getCompletedIds().includes(v._id);
              return (
                <div
                  key={v._id}
                  onClick={() => !v.isLocked && router.push(`/dashboard/videos/${v._id}`)}
                  className={`flex gap-3 p-2 rounded-lg transition ${
                    v._id === id
                      ? 'bg-purple-500/20 border border-purple-500/40'
                      : v.isLocked
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-slate-700/50 cursor-pointer'
                  }`}
                >
                  {/* Thumb */}
                  <div className="relative shrink-0 w-24 h-14 bg-slate-800 rounded overflow-hidden">
                    {v.thumbnail ? (
                      <img src={v.thumbnail} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                    {v.isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="text-yellow-400 text-sm">🔒</span>
                      </div>
                    )}
                    {vCompleted && (
                      <div className="absolute bottom-1 right-1">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <p
                    className="text-xs text-slate-300 leading-snug line-clamp-2 flex-1"
                    dir={v.language === 'ur' ? 'rtl' : 'ltr'}
                  >
                    {v.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}