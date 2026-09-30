// frontend/app/data/videoAccess.ts
// Locks videos to the user's plan: the first N videos of each language are open.
import { getVideos, getVideoById, StaticVideo } from '@/app/data/videos.data';
import type { ContentAllowance } from '@/hooks/useContentAllowance';

type Lang = 'en' | 'ur';

function openIds(lang: Lang, count: number): Set<string> {
  // Full, ordered list for the language; the first `count` videos are open
  const all = getVideos(lang, undefined, true);
  return new Set(all.slice(0, Math.max(0, count)).map((v) => v._id));
}

export function videosWithAllowance(
  lang: Lang,
  category: string | undefined,
  allowance: ContentAllowance
): StaticVideo[] {
  const count = lang === 'ur' ? allowance.videosUr : allowance.videosEn;
  const open = openIds(lang, count);
  return getVideos(lang, category, true).map((v) => ({ ...v, isLocked: !open.has(v._id) }));
}

export function videoWithAllowance(id: string, allowance: ContentAllowance): StaticVideo | undefined {
  const video = getVideoById(id, true);
  if (!video) return undefined;
  const lang = video.language as Lang;
  const count = lang === 'ur' ? allowance.videosUr : allowance.videosEn;
  return { ...video, isLocked: !openIds(lang, count).has(video._id) };
}