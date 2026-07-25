'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import useSWR, { mutate } from 'swr';
import { useAuth } from '@/app/context/authContext';
import { apiService } from '@/app/services/api';
import { Card } from '@/components/ui/card';
import {
  Bell, Send, User, Clock,
  MessageSquare, Languages, CheckCheck,
  Circle, Inbox,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  _id: string;
  senderId: string;
  senderName?: string;
  receiverId: string;
  companyId?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function avatarLetter(name?: string): string {
  return name?.charAt(0).toUpperCase() ?? '?';
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  currentUserId,
  isUrdu,
  onMarkRead,
}: {
  message: Message;
  currentUserId: string;
  isUrdu: boolean;
  onMarkRead: (id: string) => void;
}) {
  const isSent = message.senderId === currentUserId;

  return (
    <motion.div
      initial={{ opacity: 0, x: isSent ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        isSent
          ? 'bg-blue-500/20 text-blue-400'
          : 'bg-purple-500/20 text-purple-400'
      }`}>
        {isSent
          ? avatarLetter(message.senderName)
          : <User className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[70%] flex flex-col gap-1 ${isSent ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isSent
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-slate-700/60 text-slate-200 rounded-tl-sm'
          }`}
          dir={isUrdu ? 'rtl' : 'ltr'}
        >
          {message.content}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-slate-500">
            {timeAgo(message.createdAt)}
          </span>
          {isSent && (
            <CheckCheck className={`w-3.5 h-3.5 ${
              message.isRead ? 'text-blue-400' : 'text-slate-500'
            }`} />
          )}
          {!isSent && !message.isRead && (
            <button
              onClick={() => onMarkRead(message._id)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {isUrdu ? 'پڑھا' : 'Mark read'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ isUrdu }: { isUrdu: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-16 h-16 rounded-full bg-slate-700/40 flex items-center justify-center">
        <Inbox className="w-8 h-8 text-slate-500" />
      </div>
      <div className="text-center">
        <p className="text-slate-400 font-medium">
          {isUrdu ? 'ابھی کوئی پیغامات نہیں' : 'No messages yet'}
        </p>
        <p className="text-slate-500 text-sm mt-1">
          {isUrdu
            ? 'آپ کے ایڈمن کے پیغامات یہاں ظاہر ہوں گے'
            : 'Messages from your admin will appear here'}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { state }     = useAuth();
  const currentUserId = state.user?.id ?? '';

  const [isUrdu, setIsUrdu]   = useState(false);
  const [newMsg, setNewMsg]   = useState('');
  const [sending, setSending] = useState(false);

  // Fetch messages — backend returns messages where receiverId = current user
  const { data: messages = [], isLoading } = useSWR<Message[]>(
    currentUserId ? ['messages', currentUserId] : null,
    () => apiService.get<Message[]>('/messages').then(r =>
      Array.isArray(r.data) ? r.data : []
    ),
    { revalidateOnFocus: false, refreshInterval: 30000 }
  );

  const unreadCount = messages.filter(
    m => !m.isRead && m.receiverId === currentUserId
  ).length;

  async function handleSend() {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    try {
      await apiService.post('/messages', {
        content: newMsg.trim(),
        receiverId: state.user?.companyId ?? '',
      });
      setNewMsg('');
      mutate(['messages', currentUserId]);
    } catch {
      // fail silently
    } finally {
      setSending(false);
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await apiService.patch(`/messages/${id}/read`, {});
      mutate(['messages', currentUserId]);
    } catch {
      // fail silently
    }
  }

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
            <Bell className="w-6 h-6 text-yellow-400" />
            {isUrdu ? 'اطلاعات کا مرکز' : 'Notifications Center'}
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isUrdu
              ? 'اپنے ایڈمن کے پیغامات یہاں دیکھیں'
              : 'View messages and notifications from your admin'}
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

      {/* Messages Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden">

          {/* Stats bar */}
          {messages.length > 0 && (
            <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                {messages.length} {isUrdu ? 'پیغامات' : 'messages'}
              </span>
              {unreadCount > 0 && (
                <span className="flex items-center gap-1.5 text-yellow-400">
                  <Circle className="w-2 h-2 fill-yellow-400" />
                  {unreadCount} {isUrdu ? 'نئے' : 'unread'}
                </span>
              )}
            </div>
          )}

          {/* Messages list */}
          <div className="p-5 space-y-4 min-h-[320px] max-h-[480px] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-slate-700/60 shrink-0" />
                    <div className="h-12 flex-1 rounded-2xl bg-slate-700/60" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <EmptyState isUrdu={isUrdu} />
            ) : (
              messages.map(msg => (
                <MessageBubble
                  key={msg._id}
                  message={msg}
                  currentUserId={currentUserId}
                  isUrdu={isUrdu}
                  onMarkRead={handleMarkRead}
                />
              ))
            )}
          </div>

          {/* Send input */}
          <div className="px-5 py-4 border-t border-slate-700/50">
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <input
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder={isUrdu ? 'پیغام لکھیں...' : 'Write a message to your admin...'}
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                dir={isUrdu ? 'rtl' : 'ltr'}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !newMsg.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}