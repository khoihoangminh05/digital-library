import React from 'react';
import Link from 'next/link';
import { BookOpen, Search, ShieldCheck, Database, Cpu, ArrowRight, Sparkles, BookMarked } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center py-20 px-4 max-w-7xl mx-auto w-full relative">
      {/* Dynamic ambient blur blobs in background */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-violet-650/15 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-fuchsia-650/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-120 h-120 bg-pink-900/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero section */}
      <div className="text-center max-w-3xl mb-20 relative z-10">
        <div className="inline-flex items-center space-x-2 bg-violet-500/10 border border-violet-500/20 px-3.5 py-1.5 rounded-full text-xs font-black text-violet-300 uppercase tracking-widest mb-6 animate-float">
          <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
          <span>Next-Generation Vector Index</span>
        </div>
        
        <h1 className="text-5xl sm:text-7xl font-black leading-tight tracking-tight mb-8">
          The Intelligent Archive for{' '}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            Digital Publications
          </span>
        </h1>
        
        <p className="text-base sm:text-lg text-neutral-400 leading-relaxed max-w-2xl mx-auto font-medium">
          A secure, AI-powered document repository utilizing high-dimensional vector similarity embeddings to connect research topics instantly. Ask our real-time AI Tutor for immediate publication context.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/books"
            className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-extrabold px-10 py-4 rounded-xl shadow-lg shadow-violet-500/10 hover:shadow-violet-500/25 transition-all duration-200 text-center flex items-center justify-center space-x-2 cursor-pointer group hover:scale-[1.01]"
          >
            <BookMarked className="w-4 h-4 text-violet-200" />
            <span>Explore Books Archive</span>
            <ArrowRight className="w-4 h-4 text-neutral-200 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto bg-neutral-900/60 hover:bg-neutral-900/90 text-white font-extrabold px-10 py-4 rounded-xl border border-neutral-850 hover:border-neutral-750 transition-all duration-200 text-center cursor-pointer hover:scale-[1.01]"
          >
            Console Dashboard
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-8 relative z-10">
        {/* Card 1 */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-7 transition-all duration-300 group hover:-translate-y-1">
          <div className="w-12 h-12 bg-violet-500/10 rounded-xl border border-violet-500/20 text-violet-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold mb-3 group-hover:text-violet-400 transition-colors">
            Vector Similarity Search
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed font-medium">
            Instantly query semantic similarities across book contents using high-dimensional 1536-dimensional vector embedding models.
          </p>
        </div>

        {/* Card 2 */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-7 transition-all duration-300 group hover:-translate-y-1">
          <div className="w-12 h-12 bg-fuchsia-500/10 rounded-xl border border-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold mb-3 group-hover:text-fuchsia-400 transition-colors">
            Role-Based Authorization
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed font-medium">
            Granular access controls separating admins and standard viewers, fully guarded at both frontend and backend layers.
          </p>
        </div>

        {/* Card 3 */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-7 transition-all duration-300 group hover:-translate-y-1">
          <div className="w-12 h-12 bg-pink-500/10 rounded-xl border border-pink-500/20 text-pink-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold mb-3 group-hover:text-pink-400 transition-colors">
            Prisma & PostgreSQL
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed font-medium">
            Reliable database engine optimized with dedicated connection pooling adapters and native pgvector indices.
          </p>
        </div>
      </div>

      {/* Tech Stack Stats Section */}
      <div className="w-full mt-24 pt-8 border-t border-neutral-900/60 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-black text-white bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">1536</div>
            <div className="text-[10px] uppercase font-bold text-neutral-500 mt-1 tracking-wider">Vector Dimensions</div>
          </div>
          <div>
            <div className="text-3xl font-black text-white bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">Real-time</div>
            <div className="text-[10px] uppercase font-bold text-neutral-500 mt-1 tracking-wider">Tutor Sync (Socket.io)</div>
          </div>
          <div>
            <div className="text-3xl font-black text-white bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">100%</div>
            <div className="text-[10px] uppercase font-bold text-neutral-500 mt-1 tracking-wider">Secure Transient Token</div>
          </div>
          <div>
            <div className="text-3xl font-black text-white bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">Gemini</div>
            <div className="text-[10px] uppercase font-bold text-neutral-500 mt-1 tracking-wider">Powered Summary Engine</div>
          </div>
        </div>
      </div>
    </div>
  );
}
