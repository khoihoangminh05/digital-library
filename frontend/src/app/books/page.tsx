'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import { 
  Search, 
  BookOpen, 
  Loader2, 
  AlertTriangle, 
  BookMarked, 
  FileText,
  User,
  Compass,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  Database
} from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  category: string;
  createdAt: string;
}

export default function BooksArchivePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and Category filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('text');
  
  // Dynamic loading state for secure link request
  const [readingBookId, setReadingBookId] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const categories = [
    'All',
    'Artificial Intelligence',
    'Databases',
    'Frontend Web Development',
    'DevOps & Security',
    'Other'
  ];

  // Fetch filtered books with debouncing
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        let res;
        if (searchMode === 'semantic' && searchQuery.trim()) {
          // AI Semantic Search
          res = await api.get(`/books/semantic-search?q=${encodeURIComponent(searchQuery.trim())}`);
        } else {
          // Standard Text Search
          const params = new URLSearchParams();
          if (searchQuery.trim()) {
            params.append('search', searchQuery.trim());
          }
          if (selectedCategory && selectedCategory !== 'All') {
            params.append('category', selectedCategory);
          }
          res = await api.get(`/books?${params.toString()}`);
        }
        setBooks(res.data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch library collection. Please ensure you are logged in and backend is running.');
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce for search query

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedCategory, searchMode]);

  // Format publication date
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'Unknown Date';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-grow flex flex-col relative">
      {/* Decorative ambient elements */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute top-40 right-20 w-96 h-96 bg-fuchsia-600/5 rounded-full blur-3xl pointer-events-none animate-pulse-slow" style={{ animationDelay: '3s' }} />

      {/* Header Banner */}
      <div className="mb-10 relative z-10">
        <div className="flex items-center space-x-2 text-violet-400 mb-3">
          <Compass className="w-5 h-5 animate-spin-slow" />
          <span className="text-[10px] font-black uppercase tracking-wider bg-violet-500/10 border border-violet-500/25 px-3 py-1 rounded-full">
            Discovery Portal
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
          Publications Catalog
        </h1>
        <p className="text-neutral-400 text-sm mt-3 max-w-xl font-semibold leading-relaxed">
          Search the index and read secure publications. Documents are served dynamically via transient token credentials.
        </p>
      </div>

      {/* Discovery Toolbar */}
      <div className="glass-panel rounded-2xl p-6 mb-10 flex flex-col gap-6 relative z-10 shadow-xl">
        {/* Search Mode Capsule Toggles */}
        <div className="flex items-center border-b border-neutral-900/60 pb-5">
          <div className="bg-neutral-950 border border-neutral-900 p-1 rounded-xl flex space-x-1">
            <button
              onClick={() => setSearchMode('text')}
              className={`py-2 px-5 rounded-lg text-xs font-black transition-all duration-200 cursor-pointer flex items-center space-x-1.5 ${
                searchMode === 'text'
                  ? 'bg-neutral-905 border border-neutral-800 text-white shadow-md'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <span>🔍 Normal Search</span>
            </button>
            <button
              onClick={() => setSearchMode('semantic')}
              className={`py-2 px-5 rounded-lg text-xs font-black transition-all duration-200 cursor-pointer flex items-center space-x-1.5 ${
                searchMode === 'semantic'
                  ? 'bg-violet-950/40 text-violet-300 border border-violet-900/50 shadow-md'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
              <span>Smart AI Search</span>
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
            {searchMode === 'semantic' ? (
              <Sparkles className="w-5 h-5 text-violet-400" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>
          <input
            type="text"
            placeholder={
              searchMode === 'semantic'
                ? "Describe an abstract concept, question, or mood (e.g. 'scaling databases with caching', 'dualism philosophy')..."
                : "Search publications matching titles, topics, or authors..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-neutral-950/80 border focus:ring-4 focus:ring-opacity-20 rounded-xl py-4.5 pl-12 pr-4 text-sm text-white placeholder-neutral-600 outline-none transition-all duration-300 ${
              searchMode === 'semantic'
                ? 'border-violet-900/70 focus:border-violet-500 focus:ring-violet-500/20'
                : 'border-neutral-900 focus:border-violet-650 focus:ring-violet-650/15'
            }`}
          />
        </div>

        {/* Category Filters or AI Metadata Status */}
        {searchMode === 'text' ? (
          <div>
            <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3">
              Filter by classification
            </div>
            <div className="flex flex-wrap gap-2.5">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${
                      active 
                        ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 border-transparent text-white shadow-lg shadow-violet-500/10 hover:scale-[1.02]' 
                        : 'bg-neutral-950/60 border-neutral-900 hover:border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-xs text-violet-300 font-bold flex items-center space-x-2.5 bg-violet-950/15 border border-violet-900/30 p-4 rounded-xl max-w-max animate-fade-in">
            <Database className="w-4 h-4 text-violet-400 flex-shrink-0 animate-pulse" />
            <span>AI Semantic Search executes cosine distance matching against the 1536-dim vector index.</span>
          </div>
        )}
      </div>

      {/* Read Error Notification Banner */}
      {readError && (
        <div className="mb-6 flex items-start space-x-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3.5 rounded-xl text-sm animate-shake relative z-10">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="font-semibold leading-tight">{readError}</span>
        </div>
      )}

      {/* Catalog Grid */}
      <div className="flex-grow flex flex-col justify-between relative z-10">
        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center py-28 space-y-4">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
            <span className="text-xs text-neutral-500 uppercase tracking-widest font-black animate-pulse">
              Running Catalog Query...
            </span>
          </div>
        ) : error ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500/30 mb-4 animate-pulse" />
            <h3 className="text-base font-bold text-white mb-1">Catalog Query Failed</h3>
            <p className="text-neutral-500 text-xs max-w-sm leading-relaxed">
              {error}
            </p>
          </div>
        ) : books.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
            <BookMarked className="w-16 h-16 text-neutral-800 mb-4 animate-float" />
            <h3 className="text-base font-bold text-white mb-1">No matches found</h3>
            <p className="text-neutral-500 text-xs max-w-xs leading-relaxed">
              Modify your search keywords or reset category filters to view publications.
            </p>
          </div>
        ) : (
          <>
            {/* Header count indicator */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] uppercase font-black tracking-widest text-neutral-500">
                Publications Archive
              </span>
              <span className="text-xs text-neutral-300 bg-neutral-900 border border-neutral-850 px-3.5 py-1 rounded-full font-bold">
                {books.length} {books.length === 1 ? 'book' : 'books'} found
              </span>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => {
                return (
                  <div 
                    key={book.id} 
                    className="glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between group transition-all duration-300 shadow-md relative hover:shadow-violet-500/5 hover:-translate-y-1"
                  >
                    {/* Glowing highlight point inside card on hover */}
                    <div className="absolute -top-10 -right-10 w-28 h-28 bg-violet-500/0 group-hover:bg-violet-500/5 rounded-full blur-2xl pointer-events-none transition-all duration-500" />
                    
                    <div>
                      {/* Cover Thumbnail & Category Badge */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-16 h-22 bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800/80 group-hover:border-violet-500/40 flex items-center justify-center relative shadow-lg flex-shrink-0 group-hover:scale-[1.03] transition-all duration-300">
                          {book.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={book.coverUrl} 
                              alt={book.title} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="w-6 h-6 text-neutral-700" />
                          )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2.5 py-0.5 rounded-full">
                          {book.category}
                        </span>
                      </div>

                      {/* Book Meta Details */}
                      <h3 className="text-base font-extrabold text-white mb-2 group-hover:text-violet-350 transition-colors leading-snug truncate" title={book.title}>
                        {book.title}
                      </h3>
                      <div className="flex items-center text-xs text-neutral-400 font-bold mb-4 space-x-1.5">
                        <User className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{book.author}</span>
                      </div>

                      {/* Brief description */}
                      <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3 mb-6 font-medium">
                        {book.description || 'No summary has been generated for this index entry.'}
                      </p>
                    </div>

                    {/* Metadata Footer */}
                    <div className="border-t border-neutral-900/60 pt-4 flex items-center justify-between text-[10px] text-neutral-500 font-bold mb-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-neutral-600" />
                        <span>{formatDate(book.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Layers className="w-3 h-3 text-neutral-600" />
                        <span>PDF Format</span>
                      </div>
                    </div>

                    {/* Read Publication Button */}
                    <Link
                      href={`/books/read/${book.id}`}
                      className="flex items-center justify-center space-x-2 bg-neutral-950/80 border border-neutral-850 hover:border-violet-500/30 text-neutral-300 hover:text-white font-black py-3 px-4 rounded-xl text-xs transition-all duration-200 w-full cursor-pointer group-hover:bg-violet-950 active:scale-[0.99] text-center shadow-inner"
                    >
                      <BookOpen className="w-4 h-4 text-violet-400" />
                      <span>Read Publication</span>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
