'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../lib/api';
import {
  CircleDollarSign,
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Wallet,
} from 'lucide-react';

interface PenaltySlip {
  id: string;
  fineAmount: number;
  lateDays: number;
  status: 'UNPAID' | 'PAID';
  createdAt: string;
  user?: { email: string };
  borrowSlip?: { book?: { title: string; author: string } };
}

const FILTERS = ['ALL', 'UNPAID', 'PAID'] as const;
type Filter = (typeof FILTERS)[number];

export default function AdminPenaltiesPage() {
  const [penalties, setPenalties] = useState<PenaltySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchPenalties = async () => {
    setLoading(true);
    try {
      const res = await api.get('/borrow-slips/penalties');
      setPenalties(res.data);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to load penalties.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPenalties();
  }, []);

  const handlePay = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await api.patch(`/borrow-slips/penalties/${id}/pay`);
      setPenalties((prev) => prev.map((p) => (p.id === id ? { ...p, status: res.data.status } : p)));
      showNotification('success', 'Penalty marked as paid.');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to mark penalty as paid.';
      showNotification('error', Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const filtered = penalties.filter((p) => {
    const matchFilter = filter === 'ALL' || p.status === filter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.user?.email?.toLowerCase().includes(q) ||
      p.borrowSlip?.book?.title?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const totalUnpaid = penalties.filter((p) => p.status === 'UNPAID').reduce((a, p) => a + p.fineAmount, 0);
  const totalCollected = penalties.filter((p) => p.status === 'PAID').reduce((a, p) => a + p.fineAmount, 0);

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
            <CircleDollarSign className="w-5 h-5" />
            <span className="text-[10px] uppercase font-black tracking-widest bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full">
              Violation Handling
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Penalty Management</h1>
          <p className="text-xs text-neutral-450 mt-1">Track and settle overdue fines from late returns.</p>
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">${totalUnpaid.toFixed(2)}</div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Outstanding</div>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">${totalCollected.toFixed(2)}</div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Collected</div>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400">
            <CircleDollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{penalties.length}</div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Total Penalties</div>
          </div>
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
              Loading penalty records...
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <AlertTriangle className="w-12 h-12 text-neutral-600 mb-4" />
            <h3 className="text-sm font-bold text-neutral-300">No penalties found</h3>
            <p className="text-xs text-neutral-500 max-w-xs mt-1">No fines match the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-900/80 bg-neutral-950/40 text-[10px] uppercase font-black tracking-widest text-neutral-450">
                  <th className="py-4.5 px-6">Book</th>
                  <th className="py-4.5 px-6">Reader</th>
                  <th className="py-4.5 px-6">Days Late</th>
                  <th className="py-4.5 px-6">Fine</th>
                  <th className="py-4.5 px-6">Status</th>
                  <th className="py-4.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-900/20 transition-all duration-150">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-neutral-200 truncate max-w-[200px]">
                          {p.borrowSlip?.book?.title || 'Unknown'}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-semibold">
                          {formatDate(p.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-neutral-300 font-medium">{p.user?.email || '—'}</td>
                    <td className="py-4 px-6 text-xs text-neutral-400 font-bold">{p.lateDays}</td>
                    <td className="py-4 px-6 text-sm font-black text-white">${p.fineAmount.toFixed(2)}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          p.status === 'UNPAID'
                            ? 'bg-red-500/5 border-red-500/20 text-red-400'
                            : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {p.status === 'UNPAID' ? (
                        <button
                          onClick={() => handlePay(p.id)}
                          disabled={actionLoading === p.id}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-neutral-950 hover:border-emerald-500 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {actionLoading === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Banknote className="w-3.5 h-3.5" />
                          )}
                          <span>Mark Paid</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settled</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
