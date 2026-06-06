'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Loader2, LayoutDashboard, BookOpen, PlusCircle, ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role !== 'ADMIN') {
        router.push('/403');
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <span className="text-sm text-neutral-400 font-semibold uppercase tracking-widest animate-pulse">
            Verifying Admin Console Credentials...
          </span>
        </div>
      </div>
    );
  }

  // Not authenticated or not admin: render nothing while redirect is executed in useEffect
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-red-500/50 animate-spin" />
          <span className="text-sm text-red-400/80 font-semibold uppercase tracking-widest animate-pulse">
            Access Restricted. Redirecting...
          </span>
        </div>
      </div>
    );
  }

  const sidebarLinks = [
    { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Manage Books', href: '/admin/books', icon: BookOpen },
    { label: 'Add Publication', href: '/admin/books/add', icon: PlusCircle },
  ];

  // Admin access: render console sidebar layout
  return (
    <div className="flex-grow flex flex-col md:flex-row min-h-screen bg-neutral-950 text-white">
      {/* Admin left sidebar */}
      <aside className="w-full md:w-64 bg-neutral-950 border-r border-neutral-900 flex-shrink-0 flex flex-col p-5 space-y-6">
        <div className="flex items-center space-x-2 px-2">
          <Shield className="w-5 h-5 text-violet-400" />
          <span className="font-black text-sm uppercase tracking-wider bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Admin Console
          </span>
        </div>

        <nav className="flex flex-col space-y-1.5 flex-grow">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-600/10 border border-violet-500/30 text-violet-300'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-neutral-900/60">
          <Link
            href="/books"
            className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-neutral-450 hover:text-white transition-colors px-4 py-3 hover:bg-neutral-900 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Console</span>
          </Link>
        </div>
      </aside>

      {/* Main admin content */}
      <main className="flex-grow p-6 md:p-10 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
