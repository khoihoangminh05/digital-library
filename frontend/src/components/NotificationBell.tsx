'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  CheckCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Info,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const typeIcon = (type: string) => {
  switch (type) {
    case 'BORROW_APPROVED':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'BORROW_REJECTED':
      return <XCircle className="w-4 h-4 text-red-400" />;
    case 'DUE_SOON':
      return <Clock className="w-4 h-4 text-amber-400" />;
    case 'OVERDUE':
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    case 'PENALTY_ISSUED':
      return <DollarSign className="w-4 h-4 text-fuchsia-400" />;
    default:
      return <Info className="w-4 h-4 text-violet-400" />;
  }
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const NotificationBell: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications/unread-count');
      setUnread(res.data.count || 0);
    } catch {
      /* silent */
    }
  }, [isAuthenticated]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setItems(res.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  // Poll unread count
  useEffect(() => {
    if (!isAuthenticated) {
      setUnread(0);
      setItems([]);
      return;
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnread]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchItems();
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* silent */
    }
  };

  const handleClick = async (n: NotificationItem) => {
    if (!n.read) {
      try {
        await api.patch(`/notifications/${n.id}/read`);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        /* silent */
      }
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={toggle}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-violet-500/30 text-neutral-300 hover:text-white transition-all duration-200 cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[9px] font-black text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full border border-neutral-950">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[28rem] overflow-hidden rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl z-[60] flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-900">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-300">Notifications</span>
            <button
              onClick={markAllRead}
              className="flex items-center space-x-1 text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          </div>

          <div className="overflow-y-auto flex-grow">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <Bell className="w-8 h-8 text-neutral-700 mb-2" />
                <p className="text-xs text-neutral-500 font-semibold">No notifications yet</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start space-x-3 px-4 py-3 border-b border-neutral-900/60 hover:bg-neutral-900/40 transition-colors cursor-pointer ${
                    n.read ? 'opacity-60' : 'bg-violet-500/5'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">{typeIcon(n.type)}</div>
                  <div className="min-w-0 flex-grow">
                    <p className="text-xs text-neutral-200 leading-snug font-medium">{n.message}</p>
                    <span className="text-[10px] text-neutral-500 font-bold">{timeAgo(n.createdAt)}</span>
                  </div>
                  {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
