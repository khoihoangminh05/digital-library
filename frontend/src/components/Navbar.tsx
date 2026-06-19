'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Library, LogIn, LogOut, User as UserIcon, BookOpen, Compass } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Explore Books', href: '/books' },
    { label: 'Library News', href: '/news' },
  ];

  if (isAuthenticated) {
    navItems.push({ label: 'My Library', href: '/my-borrows' });
  }

  if (isAuthenticated && user?.role === 'ADMIN') {
    navItems.push({ label: 'Admin Console', href: '/admin/dashboard' });
  }

  return (
    <nav className="sticky top-0 z-50 bg-neutral-950/70 backdrop-blur-xl border-b border-neutral-900/60 text-white transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 text-violet-400 hover:text-violet-300 transition-colors group">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg blur-md opacity-25 group-hover:opacity-40 transition-opacity duration-300" />
                <Library className="w-6 h-6 relative text-violet-400 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <span className="font-black text-xl tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                Digital Library
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative text-sm font-semibold tracking-wide py-2 transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Auth buttons */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3 sm:space-x-4">
                <NotificationBell />
                <Link
                  href="/profile"
                  className="hidden sm:flex items-center space-x-2 bg-neutral-900/60 px-3.5 h-9 rounded-xl border border-neutral-800/80 backdrop-blur-md hover:border-violet-500/30 transition-colors"
                  title="View profile"
                >
                  <UserIcon className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-neutral-300 font-bold truncate max-w-[120px]">
                    {user.email}
                  </span>
                  <span className="text-[9px] bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                    {user.role}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 px-4 py-2 rounded-xl border border-neutral-800 hover:border-red-500/20 transition-all duration-200 text-xs font-black cursor-pointer shadow-md active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-1.5 bg-gradient-to-r from-violet-650 to-fuchsia-650 hover:from-violet-600 hover:to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-xs tracking-wide"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
