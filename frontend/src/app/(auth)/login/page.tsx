'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { Mail, Lock, Loader2, AlertTriangle, Library } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, user } = response.data;
      
      // Save session and redirect
      const redirectPath = user.role === 'ADMIN' ? '/admin/dashboard' : '/books';
      login(accessToken, user, redirectPath);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        const msg = err.response.data.message;
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      } else {
        setError('Connection to backend failed. Please make sure the NestJS server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-12 bg-radial from-neutral-900 to-neutral-950">
      <div className="relative w-full max-w-md">
        {/* Ambient background glow */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl" />

        {/* Card */}
        <div className="relative bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl p-8 sm:p-10">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-violet-500/10 rounded-xl border border-violet-500/20 text-violet-400 mb-4">
              <Library className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Welcome Back
            </h2>
            <p className="text-neutral-400 text-sm mt-2">
              Sign in to manage your digital publications archive
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 flex items-start space-x-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="font-medium leading-tight">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-neutral-600 outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-neutral-600 outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative flex items-center justify-center bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-200 active:scale-[0.99] disabled:scale-100 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Call to Register */}
          <div className="text-center mt-6 text-sm text-neutral-500">
            Don't have an account?{' '}
            <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              Request Access
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
