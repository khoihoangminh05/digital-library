'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  User as UserIcon,
  Mail,
  Shield,
  Calendar,
  BookOpen,
  Heart,
  Clock,
  DollarSign,
  Library,
  Lock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
} from 'lucide-react';

interface Activity {
  totalBorrows: number;
  activeBorrows: number;
  favorites: number;
  reading: number;
  unpaidPenalties: number;
  outstandingFine: number;
}

interface Profile {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  activity: Activity;
}

interface FavoriteBook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  category: string;
}

export default function ProfilePage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [favorites, setFavorites] = useState<FavoriteBook[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, favRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/favorites'),
      ]);
      setProfile(profileRes.data);
      setFavorites(favRes.data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    if (newPassword.length < 4) {
      setPwMessage({ type: 'error', text: 'New password must be at least 4 characters.' });
      return;
    }

    setPwLoading(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      setPwMessage({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      setPwMessage({ type: 'error', text: Array.isArray(msg) ? msg.join(', ') : msg });
    } finally {
      setPwLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return '—';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-28 space-y-4">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
        <span className="text-xs text-neutral-500 uppercase tracking-widest font-black animate-pulse">
          Loading Profile...
        </span>
      </div>
    );
  }

  const statCards = profile
    ? [
        { label: 'Total Borrows', value: profile.activity.totalBorrows, icon: BookOpen, color: 'text-violet-400' },
        { label: 'Active Borrows', value: profile.activity.activeBorrows, icon: Library, color: 'text-emerald-400' },
        { label: 'Favorites', value: profile.activity.favorites, icon: Heart, color: 'text-fuchsia-400' },
        { label: 'Books Reading', value: profile.activity.reading, icon: Clock, color: 'text-amber-400' },
      ]
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-grow flex flex-col relative">
      <div className="absolute top-10 left-10 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="mb-10 relative z-10">
        <div className="flex items-center space-x-2 text-violet-400 mb-3">
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-wider bg-violet-500/10 border border-violet-500/25 px-3 py-1 rounded-full">
            Account Center
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
          My Profile
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Left column: identity + password */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Identity card */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                {profile?.email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-white truncate">{profile?.email}</p>
                <span className="text-[9px] bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                  {profile?.role}
                </span>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-neutral-400">
                <Mail className="w-4 h-4 text-neutral-600" />
                <span className="font-semibold truncate">{profile?.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-neutral-400">
                <Shield className="w-4 h-4 text-neutral-600" />
                <span className="font-semibold">{profile?.status}</span>
              </div>
              <div className="flex items-center space-x-2 text-neutral-400">
                <Calendar className="w-4 h-4 text-neutral-600" />
                <span className="font-semibold">Member since {formatDate(profile?.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Change password card */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-5">
              <Lock className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-neutral-300">Change Password</h2>
            </div>

            {pwMessage && (
              <div
                className={`mb-4 flex items-start space-x-2 px-3 py-2.5 rounded-xl text-xs border ${
                  pwMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {pwMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span className="font-semibold leading-tight">{pwMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-neutral-600 outline-none transition-all"
              />
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-neutral-600 outline-none transition-all"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-neutral-600 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={pwLoading}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right column: stats + favorites */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Activity stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <div key={card.label} className="glass-panel rounded-2xl p-4 flex flex-col">
                <card.icon className={`w-5 h-5 ${card.color} mb-3`} />
                <span className="text-2xl font-black text-white">{card.value}</span>
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-1">
                  {card.label}
                </span>
              </div>
            ))}
          </div>

          {/* Outstanding fines banner */}
          {profile && profile.activity.unpaidPenalties > 0 && (
            <div className="flex items-center justify-between bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-6 h-6 text-red-400" />
                <div>
                  <p className="text-sm font-extrabold text-red-300">
                    Outstanding fine: ${profile.activity.outstandingFine.toFixed(2)}
                  </p>
                  <p className="text-xs text-neutral-400 font-semibold">
                    {profile.activity.unpaidPenalties} unpaid penalty(ies). Settle them to borrow again.
                  </p>
                </div>
              </div>
              <Link
                href="/my-borrows"
                className="flex items-center space-x-1.5 bg-red-500/10 border border-red-500/20 text-red-300 hover:text-white font-black py-2 px-4 rounded-xl text-xs transition-all"
              >
                <span>View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Favorites */}
          <div className="glass-panel rounded-2xl p-6 flex-grow">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-fuchsia-400" />
                <h2 className="text-sm font-black uppercase tracking-wider text-neutral-300">My Favorites</h2>
              </div>
              <Link href="/books" className="text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors">
                Browse catalog
              </Link>
            </div>

            {favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Heart className="w-10 h-10 text-neutral-800 mb-3" />
                <p className="text-xs text-neutral-500 font-semibold">No favorites yet. Tap the heart on any book to save it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {favorites.map((book) => (
                  <Link
                    key={book.id}
                    href={`/books/read/${book.id}`}
                    className="flex items-center space-x-3 bg-neutral-950/60 border border-neutral-850 hover:border-violet-500/30 rounded-xl p-3 transition-all group"
                  >
                    <div className="w-10 h-14 bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center flex-shrink-0">
                      {book.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-4 h-4 text-neutral-700" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-white truncate group-hover:text-violet-300 transition-colors">
                        {book.title}
                      </p>
                      <p className="text-[10px] text-neutral-500 font-bold truncate">{book.author}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
