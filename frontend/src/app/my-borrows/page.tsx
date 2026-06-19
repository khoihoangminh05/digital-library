'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  Library,
  Calendar,
  CircleDollarSign,
  ArrowRight,
} from 'lucide-react';

interface BorrowSlip {
  id: string;
  bookId: string;
  status: 'PENDING' | 'BORROWED' | 'OVERDUE' | 'RETURNED' | 'REJECTED';
  borrowDate: string | null;
  dueDate: string | null;
  returnDate: string | null;
  createdAt: string;
  book?: { title: string; author: string; coverUrl?: string };
  penaltySlip?: { id: string; fineAmount: number; lateDays: number; status: 'UNPAID' | 'PAID' } | null;
}

interface PenaltySlip {
  id: string;
  fineAmount: number;
  lateDays: number;
  status: 'UNPAID' | 'PAID';
  createdAt: string;
  borrowSlip?: { book?: { title: string; author: string } };
}

const STATUS_META: Record<
  string,
  { label: string; icon: React.ElementType; classes: string }
> = {
  PENDING: { label: 'Pending Approval', icon: Clock, classes: 'bg-amber-500/5 border-amber-500/20 text-amber-400' },
  BORROWED: { label: 'Borrowed', icon: CheckCircle2, classes: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' },
  OVERDUE: { label: 'Overdue', icon: AlertCircle, classes: 'bg-red-500/5 border-red-500/20 text-red-400' },
  RETURNED: { label: 'Returned', icon: RotateCcw, classes: 'bg-neutral-500/5 border-neutral-500/20 text-neutral-400' },
  REJECTED: { label: 'Rejected', icon: XCircle, classes: 'bg-red-500/5 border-red-500/20 text-red-400' },
};

export default function MyBorrowsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [slips, setSlips] = useState<BorrowSlip[]>([]);
  const [penalties, setPenalties] = useState<PenaltySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [slipsRes, penaltiesRes] = await Promise.all([
        api.get('/borrow-slips/my'),
        api.get('/borrow-slips/my-penalties'),
      ]);
      setSlips(slipsRes.data);
      setPenalties(penaltiesRes.data);
    } catch (err: any) {
      console.error('Failed to load borrow data:', err);
      setError(err.response?.data?.message || 'Failed to load your library activity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const totalUnpaid = penalties
    .filter((p) => p.status === 'UNPAID')
    .reduce((acc, p) => acc + p.fineAmount, 0);

  if (authLoading || loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <span className="text-xs text-neutral-500 font-black uppercase tracking-widest animate-pulse">
            Loading your library activity...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-grow flex flex-col">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center space-x-2 text-violet-400 mb-2">
          <Library className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full">
            My Library
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Borrowing Activity</h1>
        <p className="text-neutral-400 text-sm mt-2">
          Track your borrow requests, due dates, and outstanding penalties.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start space-x-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3.5 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Outstanding penalty warning */}
      {totalUnpaid > 0 && (
        <div className="mb-8 flex items-center justify-between bg-red-950/30 border border-red-500/30 rounded-2xl p-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
              <CircleDollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-red-300">Outstanding Penalties</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                You must settle these fines before borrowing new books.
              </p>
            </div>
          </div>
          <span className="text-2xl font-black text-red-400">${totalUnpaid.toFixed(2)}</span>
        </div>
      )}

      {/* Borrow Slips */}
      <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-4">
        Borrow Requests ({slips.length})
      </h2>

      {slips.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center mb-10">
          <BookOpen className="w-12 h-12 text-neutral-700 mb-3" />
          <h3 className="text-sm font-bold text-neutral-300">No borrow requests yet</h3>
          <p className="text-xs text-neutral-500 max-w-xs mt-1 mb-5">
            Browse the catalog and borrow a publication to get started.
          </p>
          <Link
            href="/books"
            className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-500 text-white font-black py-2.5 px-5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            <span>Explore Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3 mb-10">
          {slips.map((slip) => {
            const meta = STATUS_META[slip.status] || STATUS_META.PENDING;
            const Icon = meta.icon;
            return (
              <div
                key={slip.id}
                className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="w-12 h-16 bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center flex-shrink-0">
                    {slip.book?.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={slip.book.coverUrl} alt={slip.book.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-neutral-700" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-white truncate">
                      {slip.book?.title || 'Unknown Title'}
                    </h3>
                    <p className="text-xs text-neutral-400 font-semibold truncate">{slip.book?.author}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-neutral-500 font-bold">
                      {slip.borrowDate && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" /> <span>Borrowed: {formatDate(slip.borrowDate)}</span>
                        </span>
                      )}
                      {slip.dueDate && (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" /> <span>Due: {formatDate(slip.dueDate)}</span>
                        </span>
                      )}
                      {slip.returnDate && (
                        <span className="flex items-center space-x-1">
                          <RotateCcw className="w-3 h-3" /> <span>Returned: {formatDate(slip.returnDate)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {slip.penaltySlip && (
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                        slip.penaltySlip.status === 'UNPAID'
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      Fine ${slip.penaltySlip.fineAmount.toFixed(2)} · {slip.penaltySlip.status}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${meta.classes}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{meta.label}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Penalties */}
      {penalties.length > 0 && (
        <>
          <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-4">
            Penalty History ({penalties.length})
          </h2>
          <div className="space-y-3">
            {penalties.map((p) => (
              <div
                key={p.id}
                className="glass-panel rounded-2xl p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl ${
                      p.status === 'UNPAID' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    <CircleDollarSign className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">
                      {p.borrowSlip?.book?.title || 'Unknown Title'}
                    </h3>
                    <p className="text-[10px] text-neutral-500 font-bold mt-0.5">
                      {p.lateDays} day(s) late · {formatDate(p.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-lg font-black text-white">${p.fineAmount.toFixed(2)}</span>
                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                      p.status === 'UNPAID'
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
