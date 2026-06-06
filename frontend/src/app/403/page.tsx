'use client';

import React from 'react';
import Link from 'next/link';
import { AlertOctagon, ArrowLeft } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center px-4 text-center py-20 bg-radial from-neutral-900 to-neutral-950">
      <div className="relative w-full max-w-md bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 sm:p-10 shadow-2xl flex flex-col items-center">
        {/* Glow */}
        <div className="absolute -top-12 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Warning Icon */}
        <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20 text-red-400 mb-6 animate-pulse">
          <AlertOctagon className="w-12 h-12" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          403 Forbidden
        </h1>
        <p className="text-neutral-400 text-sm mb-8 leading-relaxed max-w-xs">
          Access Denied. You do not have the required administrative permissions to access the requested dashboard.
        </p>

        <Link
          href="/books"
          className="flex items-center justify-center space-x-2 bg-neutral-800 hover:bg-neutral-750 text-white font-bold py-3 px-6 rounded-xl border border-neutral-700 hover:border-neutral-600 transition-all duration-200 w-full active:scale-[0.99] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-violet-400" />
          <span>Return to Books Archive</span>
        </Link>
      </div>
    </div>
  );
}
