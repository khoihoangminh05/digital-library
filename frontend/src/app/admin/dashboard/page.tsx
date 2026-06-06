import React from 'react';
import Link from 'next/link';
import { Database, Users, BookOpen, Layers } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow flex flex-col">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          Librarian Console
        </h1>
        <p className="text-neutral-400 text-sm mt-1">
          Welcome to the administration dashboard. Manage publications and oversee vector indexing.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Card 1 */}
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-violet-500/10 rounded-lg text-violet-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black">148</div>
            <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Indexed Books</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-fuchsia-500/10 rounded-lg text-fuchsia-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black">1,204</div>
            <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Active Readers</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-pink-500/10 rounded-lg text-pink-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black">1536d</div>
            <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">OpenAI Dimensions</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black">Healthy</div>
            <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">pgvector index</div>
          </div>
        </div>
      </div>

      {/* Main Console Content */}
      <div className="bg-neutral-900/20 border border-neutral-800 rounded-2xl p-6 sm:p-8 flex-grow flex flex-col justify-center items-center text-center">
        <Database className="w-16 h-16 text-neutral-700 mb-4" />
        <h2 className="text-xl font-bold mb-2">Publications Database</h2>
        <p className="text-neutral-400 text-sm max-w-md mb-6 leading-relaxed">
          Admin portal ready. You can now execute high-privileged commands including creating new vector representations, running schema migrations, and managing secure reader sessions.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/admin/books">
            <button className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-violet-500/10 cursor-pointer w-full sm:w-auto">
              Manage Publications
            </button>
          </Link>
          <Link href="/admin/books/add">
            <button className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-bold px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer w-full sm:w-auto">
              Add New Publication
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
