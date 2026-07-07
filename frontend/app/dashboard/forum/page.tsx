'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR, { mutate } from 'swr';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/app/context/authContext';
import {
  forumApi,
  ForumPost,
  ForumComment,
} from '@/app/services/forumApi';
import {
  MessageSquare, Plus, Send, Trash2,
  Pencil, X, Check, ChevronDown, ChevronUp,
  Globe, Languages,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function avatar(name: string) {
  return name?.charAt(0).toUpperCase() ?? '?';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  currentUserId,
  postId,
  isUrdu,
  onDeleted,
}: {
  comment: ForumComment;
  currentUserId: string;
  postId: string;
  isUrdu: boolean;
  onDeleted: () => void;
}) {
  const [editing, setEditing]   = useState(false);
  const [text, setText]         = useState(comment.commentText);
  const [saving, setSaving]     = useState(false);
  const isOwn = comment.userId === currentUserId;

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await forumApi.updateComment(postId, comment._id, text.trim());
      mutate(['forum-comments', postId]);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(isUrdu ? 'حذف کریں؟' : 'Delete this comment?')) return;
    await forumApi.deleteComment(postId, comment._id);
    onDeleted();
  }

  return (
    <div className="flex gap-3 py-3 border-b border-slate-700/40 last:border-0">
      <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
        {avatar(comment.authorName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-semibold text-blue-400">
            {comment.authorName}
          </span>
          <span className="text-xs text-slate-500">{timeAgo(comment.createdAt)}</span>
        </div>

        {editing ? (
          <div className="flex gap-2 mt-1">
            <input
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              value={text}
              onChange={e => setText(e.target.value)}
              dir={isUrdu ? 'rtl' : 'ltr'}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setEditing(false); setText(comment.commentText); }}
              className="p-1.5 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-300 break-words" dir={isUrdu ? 'rtl' : 'ltr'}>
            {comment.commentText}
          </p>
        )}
      </div>

      {isOwn && !editing && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  currentUserId,
  isUrdu,
}: {
  post: ForumPost;
  currentUserId: string;
  isUrdu: boolean;
}) {
  const [expanded, setExpanded]       = useState(false);
  const [replyText, setReplyText]     = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [editMode, setEditMode]       = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const isOwn = post.userId === currentUserId;

  const { data: comments = [], mutate: mutateComments } = useSWR<ForumComment[]>(
    expanded ? ['forum-comments', post._id] : null,
    () => forumApi.getComments(post._id),
    { revalidateOnFocus: false }
  );

  async function handleReply() {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await forumApi.addComment(post._id, {
        commentText: replyText.trim(),
        isUrdu,
      });
      setReplyText('');
      mutateComments();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSave() {
    if (!editContent.trim()) return;
    await forumApi.updatePost(post._id, editContent.trim());
    mutate('forum-posts');
    setEditMode(false);
  }

  async function handleDelete() {
    if (!confirm(isUrdu ? 'یہ پوسٹ حذف کریں؟' : 'Delete this post?')) return;
    await forumApi.deletePost(post._id);
    mutate('forum-posts');
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="bg-slate-800/60 border-slate-700/50 hover:border-blue-500/40 transition-colors overflow-hidden">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {avatar(post.authorName)}
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-400">{post.authorName}</p>
                <p className="text-xs text-slate-500">{timeAgo(post.createdAt)}</p>
              </div>
            </div>

            {isOwn && (
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditMode(e => !e)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          {editMode ? (
            <div className="mb-3">
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                dir={isUrdu ? 'rtl' : 'ltr'}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleEditSave}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
                >
                  <Check className="w-4 h-4" />
                  {isUrdu ? 'محفوظ کریں' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditMode(false); setEditContent(post.content); }}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
                >
                  {isUrdu ? 'منسوخ' : 'Cancel'}
                </button>
              </div>
            </div>
          ) : (
            <p
              className="text-sm text-slate-300 leading-relaxed mb-4 break-words"
              dir={post.isUrdu ? 'rtl' : 'ltr'}
            >
              {post.content}
            </p>
          )}

          {/* Toggle comments */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-blue-400 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>
              {isUrdu ? 'جوابات' : 'Replies'}
              {post.commentCount ? ` (${post.commentCount})` : ''}
            </span>
            {expanded
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Comments section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-2 border-t border-slate-700/40">
                <div className="pt-3 space-y-0">
                  {comments.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">
                      {isUrdu ? 'ابھی کوئی جواب نہیں' : 'No replies yet'}
                    </p>
                  ) : (
                    comments.map(c => (
                      <CommentItem
                        key={c._id}
                        comment={c}
                        currentUserId={currentUserId}
                        postId={post._id}
                        isUrdu={isUrdu}
                        onDeleted={() => mutateComments()}
                      />
                    ))
                  )}
                </div>

                {/* Reply input */}
                <div className="flex gap-2 pt-3 pb-1">
                  <input
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder={isUrdu ? 'جواب لکھیں...' : 'Write a reply...'}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    dir={isUrdu ? 'rtl' : 'ltr'}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                  />
                  <button
                    onClick={handleReply}
                    disabled={submitting || !replyText.trim()}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ForumPage() {
  const { state } = useAuth();
  const currentUserId = state.user?._id ?? '';

  const [isUrdu, setIsUrdu]         = useState(false);
  const [newPost, setNewPost]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: posts = [], isLoading } = useSWR<ForumPost[]>(
    'forum-posts',
    () => forumApi.getAllPosts(),
    { revalidateOnFocus: false }
  );

  async function handleCreatePost() {
    if (!newPost.trim()) return;
    setSubmitting(true);
    try {
      await forumApi.createPost({ content: newPost.trim(), isUrdu });
      setNewPost('');
      mutate('forum-posts');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-6">

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-400" />
            {isUrdu ? 'کمیونٹی فورم' : 'Community Forum'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isUrdu
              ? 'ماہرین سے رابطہ کریں اور اپنے سیکیورٹی خدشات شیئر کریں'
              : 'Connect with experts and share your security concerns'}
          </p>
        </div>

        {/* Language Toggle */}
        <button
          onClick={() => setIsUrdu(u => !u)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-blue-500/50 text-sm text-slate-300 transition-colors shrink-0"
        >
          <Languages className="w-4 h-4 text-blue-400" />
          {isUrdu ? 'Switch to English' : 'اردو میں دیکھیں'}
        </button>
      </motion.div>

      {/* Create Post Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-slate-800/60 border-slate-700/50 p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" />
            {isUrdu ? 'نئی پوسٹ بنائیں' : 'Create New Post'}
          </h2>
          <textarea
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            rows={3}
            placeholder={
              isUrdu
                ? 'آپ کا سوال یا تجربہ کیا ہے؟'
                : 'Ask a question or share your experience...'
            }
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            dir={isUrdu ? 'rtl' : 'ltr'}
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleCreatePost}
              disabled={submitting || !newPost.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
              {isUrdu ? 'پوسٹ کریں' : 'Post'}
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Posts List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-32 bg-slate-800/40 border-slate-700/50 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="bg-slate-800/40 border-slate-700/50 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">
            {isUrdu ? 'ابھی کوئی پوسٹ نہیں' : 'No posts yet'}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {isUrdu ? 'پہلی پوسٹ بنائیں!' : 'Be the first to start a discussion!'}
          </p>
        </Card>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                currentUserId={currentUserId}
                isUrdu={isUrdu}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}