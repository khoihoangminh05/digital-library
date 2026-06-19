'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import {
  BookOpen,
  Users,
  ClipboardList,
  AlertCircle,
  Loader2,
  TrendingUp,
  CircleDollarSign,
  Star,
  Clock,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Trophy,
  Layers,
  Banknote,
  Wallet,
} from 'lucide-react';

interface Stats {
  overview: {
    totalBooks: number;
    totalUsers: number;
    bannedUsers: number;
    totalReviews: number;
    activeBorrows: number;
    pendingRequests: number;
    overdueCount: number;
    returnedCount: number;
  };
  penalties: {
    unpaidAmount: number;
    unpaidCount: number;
    collectedAmount: number;
  };
  topBooks: { bookId: string; title: string; author: string; borrowCount: number }[];
  categoryDistribution: { category: string; count: number }[];
  recentBorrows: { id: string; status: string; bookTitle: string; userEmail: string; createdAt: string }[];
  borrowsByMonth: { month: string; count: number }[];
}

const CATEGORY_COLORS = ['#8b5cf6', '#d946ef', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#f43f5e', '#a3a3a3'];

const STATUS_BADGE: Record<string, { icon: React.ElementType; classes: string }> = {
  PENDING: { icon: Clock, classes: 'text-amber-400' },
  BORROWED: { icon: CheckCircle2, classes: 'text-emerald-400' },
  OVERDUE: { icon: AlertCircle, classes: 'text-red-400' },
  RETURNED: { icon: RotateCcw, classes: 'text-neutral-400' },
  REJECTED: { icon: XCircle, classes: 'text-red-400' },
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <span className="text-xs text-neutral-500 font-black uppercase tracking-widest animate-pulse">
            Aggregating platform metrics...
          </span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-3 text-center">
          <AlertCircle className="w-12 h-12 text-red-500/40" />
          <h3 className="text-sm font-bold text-white">Unable to load dashboard</h3>
          <p className="text-xs text-neutral-500 max-w-xs">{error}</p>
        </div>
      </div>
    );
  }

  const { overview, penalties, topBooks, categoryDistribution, recentBorrows, borrowsByMonth } = stats;

  const maxMonth = Math.max(...borrowsByMonth.map((m) => m.count), 1);
  const maxTop = Math.max(...topBooks.map((b) => b.borrowCount), 1);
  const totalCategoryBooks = categoryDistribution.reduce((a, c) => a + c.count, 0) || 1;

  const metricCards = [
    { label: 'Total Books', value: overview.totalBooks, icon: BookOpen, color: 'violet' },
    { label: 'Registered Users', value: overview.totalUsers, icon: Users, color: 'fuchsia' },
    { label: 'Active Borrows', value: overview.activeBorrows, icon: ClipboardList, color: 'emerald' },
    { label: 'Pending Requests', value: overview.pendingRequests, icon: Clock, color: 'amber' },
  ];

  const colorMap: Record<string, string> = {
    violet: 'bg-violet-500/10 text-violet-400',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
  };

  const formatMonth = (m: string) => {
    const [y, mo] = m.split('-');
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
  };

  // Build donut segments
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  const donutSegments = categoryDistribution.slice(0, 8).map((c, i) => {
    const fraction = c.count / totalCategoryBooks;
    const dash = fraction * circumference;
    const segment = {
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      dasharray: `${dash} ${circumference - dash}`,
      dashoffset: -cumulative,
      ...c,
      fraction,
    };
    cumulative += dash;
    return segment;
  });

  return (
    <div className="max-w-7xl mx-auto w-full flex-grow flex flex-col space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          Librarian Console
        </h1>
        <p className="text-neutral-400 text-sm mt-1">
          Real-time overview of your digital library operations.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass-panel rounded-2xl p-5 flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${colorMap[card.color]}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black">{card.value.toLocaleString()}</div>
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Penalty + secondary metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center space-x-2 text-red-400 mb-2">
            <Wallet className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">Outstanding Fines</span>
          </div>
          <div className="text-2xl font-black text-white">${penalties.unpaidAmount.toFixed(2)}</div>
          <div className="text-[10px] text-neutral-500 font-bold mt-1">{penalties.unpaidCount} unpaid</div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center space-x-2 text-emerald-400 mb-2">
            <Banknote className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">Collected Fines</span>
          </div>
          <div className="text-2xl font-black text-white">${penalties.collectedAmount.toFixed(2)}</div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center space-x-2 text-red-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">Overdue</span>
          </div>
          <div className="text-2xl font-black text-white">{overview.overdueCount}</div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center space-x-2 text-amber-400 mb-2">
            <Star className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">Reviews</span>
          </div>
          <div className="text-2xl font-black text-white">{overview.totalReviews}</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly borrow trend */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-neutral-300">Borrowing Trend (6 mo)</h2>
          </div>
          <div className="flex items-end justify-between gap-3 h-48">
            {borrowsByMonth.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                <span className="text-[10px] font-black text-neutral-400">{m.count}</span>
                <div
                  className="w-full bg-gradient-to-t from-violet-600 to-fuchsia-500 rounded-t-lg transition-all duration-500 min-h-[4px]"
                  style={{ height: `${(m.count / maxMonth) * 100}%` }}
                />
                <span className="text-[10px] font-bold text-neutral-500 uppercase">{formatMonth(m.month)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category donut */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Layers className="w-4 h-4 text-fuchsia-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-neutral-300">Categories</h2>
          </div>
          {categoryDistribution.length === 0 ? (
            <p className="text-xs text-neutral-500 py-10 text-center">No books yet.</p>
          ) : (
            <div className="flex flex-col items-center">
              <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
                {donutSegments.map((seg, i) => (
                  <circle
                    key={i}
                    cx="75"
                    cy="75"
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="18"
                    strokeDasharray={seg.dasharray}
                    strokeDashoffset={seg.dashoffset}
                  />
                ))}
              </svg>
              <div className="w-full space-y-1.5 mt-4">
                {donutSegments.map((seg, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center space-x-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-neutral-400 font-semibold truncate">{seg.category}</span>
                    </span>
                    <span className="text-neutral-300 font-black flex-shrink-0 ml-2">{seg.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top books + recent activity row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top borrowed books */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-neutral-300">Most Borrowed</h2>
          </div>
          {topBooks.length === 0 ? (
            <p className="text-xs text-neutral-500 py-8 text-center">No borrow activity yet.</p>
          ) : (
            <div className="space-y-4">
              {topBooks.map((b, i) => (
                <div key={b.bookId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-200 truncate max-w-[70%]">
                      <span className="text-neutral-500 mr-2">#{i + 1}</span>
                      {b.title}
                    </span>
                    <span className="text-[10px] font-black text-violet-300">{b.borrowCount} borrows</span>
                  </div>
                  <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-full transition-all duration-500"
                      style={{ width: `${(b.borrowCount / maxTop) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-5">
            <ClipboardList className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-neutral-300">Recent Activity</h2>
          </div>
          {recentBorrows.length === 0 ? (
            <p className="text-xs text-neutral-500 py-8 text-center">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {recentBorrows.map((r) => {
                const badge = STATUS_BADGE[r.status] || STATUS_BADGE.PENDING;
                const Icon = badge.icon;
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${badge.classes}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-200 truncate">{r.bookTitle}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{r.userEmail}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-bold flex-shrink-0">
                      {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <CircleDollarSign className="w-8 h-8 text-violet-400" />
          <div>
            <h3 className="text-sm font-black text-white">Manage Operations</h3>
            <p className="text-xs text-neutral-400">Jump to circulation, penalties, or add new publications.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/borrows">
            <button className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer">
              Borrow Requests
            </button>
          </Link>
          <Link href="/admin/penalties">
            <button className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer">
              Penalties
            </button>
          </Link>
          <Link href="/admin/books/add">
            <button className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer">
              Add Publication
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
