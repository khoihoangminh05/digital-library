'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../lib/api';
import {
  ClipboardList,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  Check,
  X,
  Search,
  AlertTriangle,
} from 'lucide-react';

interface BorrowSlip {
  id: string;
  status: 'PENDING' | 'BORROWED' | 'OVERDUE' | 'RETURNED' | 'REJECTED';
  borrowDate: string | null;
  dueDate: string | null;
  returnDate: string | null;
  createdAt: string;
  book?: { title: string; author: string };
  user?: { email: string };
  penaltySlip?: { fineAmount: number; status: 'UNPAID' | 'PAID' } | null;
}

const FILTERS = ['ALL', 'PENDING', 'BORROWED', 'OVERDUE', 'RETURNED', 'REJECTED'] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_META: Record<string, { icon: React.ElementType; classes: string }> = {
  PENDING: { icon: Clock, classes: 'bg-amber-500/5 border-amber-500/20 text-amber-400' },
  BORROWED: { icon: CheckCircle2, classes: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' },
  OVERDUE: { icon: AlertCircle, classes: 'bg-red-500/5 border-red-500/20 text-red-400' },
  RETURNED: { icon: RotateCcw, classes: 'bg-neutral-500/5 border-neutral-500/20 text-neutral-400' },
  REJECTED: { icon: XCircle, classes: 'bg-red-500/5 border-red-500/20 text-red-400' },
};

export default function AdminBorrowsPage() {
  const [slips, setSlips] = useState<BorrowSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchSlips = async () => {
    setLoading(true);
    try {
      const res = await api.get('/borrow-slips');
      setSlips(res.data);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to load borrow slips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlips();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'return') => {
    setActionLoading(`${id}-${action}`);
    try {
      const res = await api.patch(`/borrow-slips/${id}/${action}`);
      setSlips((prev) => prev.map((s) => (s.id === id ? { ...s, ...res.data } : s)));
      showNotification('success', `Borrow slip ${action}d successfully.`);
      // Re-fetch to pull joined fields (penalty etc.)
      fetchSlips();
    } catch (err: any) {
      const msg = err.response?.data?.message || `Failed to ${action} borrow slip.`;
      showNotification('error', Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

  const filtered = slips.filter((s) => {
    const matchFilter = filter === 'ALL' || s.status === filter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      s.user?.email?.toLowerCase().includes(q) ||
      s.book?.title?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const pendingCount = slips.filter((s) => s.status === 'PENDING').length;

  return (
    <div className="space-y-8 max-w-6xl w-full mx-auto relative">
      {notification && (
        <div
          className={`fixed top-6 right-6 z-55 flex items-center space-x-3 px-5 py-4 rounded-xl shadow-xl border ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/90 border-red-500/30 text-red-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 text-violet-400 mb-1.5">
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px] uppercase font-black tracking-widest bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full">
              Circulation Desk
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Borrow Requests</h1>
          <p className="text-xs text-neutral-450 mt-1">
            Approve, reject, and process returns. {pendingCount > 0 && (
              <span className="text-amber-400 font-bold">{pendingCount} request(s) awaiting approval.</span>
            )}
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by user email or book title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900/60 hover:bg-neutral-900 focus:bg-neutral-900 border border-neutral-850 hover:border-neutral-800 focus:border-violet-500/50 outline-none text-xs rounded-xl pl-10 pr-4 py-3 text-white placeholder-neutral-500 transition-all font-medium"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`py-2 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
              filter === f
                ? 'bg-violet-600/10 border-violet-500/30 text-violet-300'
                : 'bg-neutral-950/60 border-neutral-900 hover:border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden rounded-2xl border border-neutral-900">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest animate-pulse">
              Loading circulation records...
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <AlertTriangle className="w-12 h-12 text-neutral-600 mb-4" />
            <h3 className="text-sm font-bold text-neutral-300">No borrow slips found</h3>
            <p className="text-xs text-neutral-500 max-w-xs mt-1">Adjust your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-900/80 bg-neutral-950/40 text-[10px] uppercase font-black tracking-widest text-neutral-450">
                  <th className="py-4.5 px-6">Book</th>
                  <th className="py-4.5 px-6">Reader</th>
                  <th className="py-4.5 px-6">Due Date</th>
                  <th className="py-4.5 px-6">Status</th>
                  <th className="py-4.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60">
                {filtered.map((s) => {
                  const meta = STATUS_META[s.status] || STATUS_META.PENDING;
                  const Icon = meta.icon;
                  const overdueSoon =
                    s.status === 'BORROWED' && s.dueDate && new Date(s.dueDate) < new Date();
                  return (
                    <tr key={s.id} className="hover:bg-neutral-900/20 transition-all duration-150">
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-neutral-200 truncate max-w-[200px]">
                            {s.book?.title || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-semibold">{s.book?.author}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-neutral-300 font-medium">{s.user?.email || '—'}</td>
                      <td className="py-4 px-6 text-xs font-medium">
                        <span className={overdueSoon ? 'text-red-400 font-bold' : 'text-neutral-400'}>
                          {formatDate(s.dueDate)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${meta.classes}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{s.status}</span>
                        </span>
                        {s.penaltySlip && (
                          <div className="mt-1.5 text-[10px] text-red-400 font-bold">
                            Fine: ${s.penaltySlip.fineAmount.toFixed(2)} ({s.penaltySlip.status})
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {s.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleAction(s.id, 'approve')}
                                disabled={actionLoading === `${s.id}-approve`}
                                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-neutral-950 hover:border-emerald-500 transition-all cursor-pointer disabled:opacity-40"
                              >
                                {actionLoading === `${s.id}-approve` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleAction(s.id, 'reject')}
                                disabled={actionLoading === `${s.id}-reject`}
                                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all cursor-pointer disabled:opacity-40"
                              >
                                {actionLoading === `${s.id}-reject` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
                                )}
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                          {(s.status === 'BORROWED' || s.status === 'OVERDUE') && (
                            <button
                              onClick={() => handleAction(s.id, 'return')}
                              disabled={actionLoading === `${s.id}-return`}
                              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-violet-500/5 border border-violet-500/10 text-violet-300 hover:bg-violet-600 hover:text-white hover:border-violet-500 transition-all cursor-pointer disabled:opacity-40"
                            >
                              {actionLoading === `${s.id}-return` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                              <span>Mark Returned</span>
                            </button>
                          )}
                          {['RETURNED', 'REJECTED'].includes(s.status) && (
                            <span className="text-[10px] text-neutral-600 font-bold uppercase">No actions</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
