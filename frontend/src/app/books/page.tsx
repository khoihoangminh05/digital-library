'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
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
  Database,
  BookPlus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Heart,
  ChevronLeft,
  ChevronRight,
  PlayCircle
} from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  category: string;
  tags?: string[];
  keyConcepts?: string[];
  createdAt: string;
  similarity?: number;
}

interface ReadingItem {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  category: string;
  currentPage: number;
  lastReadAt: string;
}

type BorrowState = 'PENDING' | 'BORROWED' | 'OVERDUE' | 'RETURNED' | 'REJECTED';

const PAGE_SIZE = 9;

export default function BooksArchivePage() {
  const { isAuthenticated } = useAuth();
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

  // Borrow workflow state
  const [borrowMap, setBorrowMap] = useState<Record<string, BorrowState>>({});
  const [borrowingId, setBorrowingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Personalized recommendations
  const [recommendations, setRecommendations] = useState<Book[]>([]);

  // Favorites, continue reading, sorting and pagination
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [readingHistory, setReadingHistory] = useState<ReadingItem[]>([]);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<string>('desc');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalBooks, setTotalBooks] = useState<number>(0);

  const fetchFavorites = async () => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      return;
    }
    try {
      const res = await api.get('/favorites/ids');
      setFavoriteIds(new Set(res.data));
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    }
  };

  const fetchReadingHistory = async () => {
    if (!isAuthenticated) {
      setReadingHistory([]);
      return;
    }
    try {
      const res = await api.get('/books/reading/history');
      setReadingHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch reading history:', err);
    }
  };

  useEffect(() => {
    fetchFavorites();
    fetchReadingHistory();
  }, [isAuthenticated]);

  const toggleFavorite = async (bookId: string) => {
    if (!isAuthenticated) {
      showNotification('error', 'Please sign in to save favorites.');
      return;
    }
    const isFav = favoriteIds.has(bookId);
    // Optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
    try {
      if (isFav) {
        await api.delete(`/favorites/${bookId}`);
      } else {
        await api.post(`/favorites/${bookId}`);
      }
    } catch (err) {
      // Revert on failure
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(bookId);
        else next.delete(bookId);
        return next;
      });
      showNotification('error', 'Failed to update favorites.');
    }
  };

  const fetchRecommendations = async () => {
    if (!isAuthenticated) {
      setRecommendations([]);
      return;
    }
    try {
      const res = await api.get('/books/recommendations');
      setRecommendations(res.data);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [isAuthenticated]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch the current user's active borrow slips to reflect status on each card
  const fetchMySlips = async () => {
    if (!isAuthenticated) {
      setBorrowMap({});
      return;
    }
    try {
      const res = await api.get('/borrow-slips/my');
      const map: Record<string, BorrowState> = {};
      for (const slip of res.data) {
        // Keep the most relevant (active) status per book
        const active = ['PENDING', 'BORROWED', 'OVERDUE'].includes(slip.status);
        if (active || !map[slip.bookId]) {
          map[slip.bookId] = slip.status;
        }
      }
      setBorrowMap(map);
    } catch (err) {
      console.error('Failed to fetch borrow slips:', err);
    }
  };

  useEffect(() => {
    fetchMySlips();
  }, [isAuthenticated]);

  const handleBorrow = async (bookId: string) => {
    if (!isAuthenticated) {
      showNotification('error', 'Please sign in to borrow books.');
      return;
    }
    setBorrowingId(bookId);
    try {
      await api.post('/borrow-slips', { bookId });
      setBorrowMap((prev) => ({ ...prev, [bookId]: 'PENDING' }));
      showNotification('success', 'Borrow request submitted. Awaiting librarian approval.');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit borrow request.';
      showNotification('error', Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setBorrowingId(null);
    }
  };

  const categories = [
    'All',
    'Artificial Intelligence',
    'Databases',
    'Frontend Web Development',
    'DevOps & Security',
    'Other'
  ];

  // Reset to first page whenever filters/sort/mode change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, sortBy, order, searchMode]);

  // Fetch filtered books with debouncing
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        if (searchMode === 'semantic' && searchQuery.trim()) {
          // AI Semantic Search (no pagination)
          const res = await api.get(`/books/semantic-search?q=${encodeURIComponent(searchQuery.trim())}`);
          setBooks(res.data);
          setTotalPages(1);
          setTotalBooks(res.data.length);
        } else {
          // Standard Text Search with sorting + pagination
          const params = new URLSearchParams();
          params.append('paginated', 'true');
          params.append('page', String(page));
          params.append('limit', String(PAGE_SIZE));
          params.append('sortBy', sortBy);
          params.append('order', order);
          if (searchQuery.trim()) {
            params.append('search', searchQuery.trim());
          }
          if (selectedCategory && selectedCategory !== 'All') {
            params.append('category', selectedCategory);
          }
          const res = await api.get(`/books?${params.toString()}`);
          setBooks(res.data.items);
          setTotalPages(res.data.totalPages || 1);
          setTotalBooks(res.data.total || 0);
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch library collection. Please ensure you are logged in and backend is running.');
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce for search query

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedCategory, searchMode, sortBy, order, page]);

  // Format publication date
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'Unknown Date';
    }
  };

  // Render the borrow action/status badge for a book card
  const renderBorrowControl = (bookId: string) => {
    const status = borrowMap[bookId];

    if (status === 'PENDING') {
      return (
        <div className="flex items-center justify-center space-x-2 bg-amber-500/5 border border-amber-500/20 text-amber-400 font-black py-3 px-4 rounded-xl text-xs w-full">
          <Clock className="w-4 h-4" />
          <span>Pending Approval</span>
        </div>
      );
    }
    if (status === 'BORROWED') {
      return (
        <div className="flex items-center justify-center space-x-2 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 font-black py-3 px-4 rounded-xl text-xs w-full">
          <CheckCircle2 className="w-4 h-4" />
          <span>Borrowed</span>
        </div>
      );
    }
    if (status === 'OVERDUE') {
      return (
        <div className="flex items-center justify-center space-x-2 bg-red-500/5 border border-red-500/20 text-red-400 font-black py-3 px-4 rounded-xl text-xs w-full">
          <AlertCircle className="w-4 h-4" />
          <span>Overdue</span>
        </div>
      );
    }

    return (
      <button
        onClick={() => handleBorrow(bookId)}
        disabled={borrowingId === bookId}
        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black py-3 px-4 rounded-xl text-xs transition-all duration-200 w-full cursor-pointer active:scale-[0.99] disabled:opacity-50 shadow-lg shadow-violet-500/10"
      >
        {borrowingId === bookId ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <BookPlus className="w-4 h-4" />
        )}
        <span>{status === 'REJECTED' ? 'Request Again' : 'Borrow Book'}</span>
      </button>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-grow flex flex-col relative">
      {/* Borrow notification toast */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-55 flex items-center space-x-3 px-5 py-4 rounded-xl shadow-xl transition-all duration-300 border ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/90 border-red-500/30 text-red-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider">{notification.message}</span>
        </div>
      )}

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

      {/* Personalized Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-10 relative z-10">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
            <h2 className="text-sm font-black uppercase tracking-wider text-neutral-300">Recommended For You</h2>
            <span className="text-[10px] text-neutral-500 font-bold">· based on your borrowing history</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-neutral-900">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="glass-panel rounded-2xl p-4 flex-shrink-0 w-60 flex flex-col group hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-12 h-16 bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center flex-shrink-0">
                    {rec.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={rec.coverUrl} alt={rec.title} className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-5 h-5 text-neutral-700" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-extrabold text-white truncate" title={rec.title}>{rec.title}</h3>
                    <p className="text-[10px] text-neutral-400 font-bold truncate">{rec.author}</p>
                    {typeof rec.similarity === 'number' && (
                      <span className="inline-block mt-1 text-[9px] font-black text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                        {(rec.similarity * 100).toFixed(0)}% match
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed line-clamp-2 mb-3 flex-grow">
                  {rec.description || 'No summary available.'}
                </p>
                <Link
                  href={`/books/read/${rec.id}`}
                  className="flex items-center justify-center space-x-1.5 bg-neutral-950/80 border border-neutral-850 hover:border-violet-500/30 text-neutral-300 hover:text-white font-black py-2 px-3 rounded-lg text-[11px] transition-all cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                  <span>Read Now</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Continue Reading */}
      {readingHistory.length > 0 && (
        <div className="mb-10 relative z-10">
          <div className="flex items-center space-x-2 mb-4">
            <PlayCircle className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-neutral-300">Continue Reading</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-neutral-900">
            {readingHistory.map((item) => (
              <Link
                key={item.id}
                href={`/books/read/${item.id}`}
                className="glass-panel rounded-2xl p-4 flex-shrink-0 w-64 flex items-center space-x-3 group hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-16 bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center flex-shrink-0">
                  {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-5 h-5 text-neutral-700" />
                  )}
                </div>
                <div className="min-w-0 flex-grow">
                  <h3 className="text-xs font-extrabold text-white truncate group-hover:text-emerald-300 transition-colors" title={item.title}>
                    {item.title}
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-bold truncate mb-2">{item.author}</p>
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black">Page {item.currentPage}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                Filter by classification
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Sort</span>
                <select
                  value={`${sortBy}:${order}`}
                  onChange={(e) => {
                    const [sb, ord] = e.target.value.split(':');
                    setSortBy(sb);
                    setOrder(ord);
                  }}
                  className="bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl py-2 px-3 text-xs text-white outline-none transition-all cursor-pointer"
                >
                  <option value="createdAt:desc">Newest first</option>
                  <option value="createdAt:asc">Oldest first</option>
                  <option value="title:asc">Title (A–Z)</option>
                  <option value="title:desc">Title (Z–A)</option>
                  <option value="author:asc">Author (A–Z)</option>
                  <option value="author:desc">Author (Z–A)</option>
                </select>
              </div>
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
                {totalBooks} {totalBooks === 1 ? 'book' : 'books'} found
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
                        <div className="flex flex-col items-end space-y-2">
                          <button
                            onClick={() => toggleFavorite(book.id)}
                            title={favoriteIds.has(book.id) ? 'Remove from favorites' : 'Add to favorites'}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-200 cursor-pointer active:scale-90 ${
                              favoriteIds.has(book.id)
                                ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400'
                                : 'bg-neutral-950/60 border-neutral-850 text-neutral-500 hover:text-fuchsia-400 hover:border-fuchsia-500/30'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${favoriteIds.has(book.id) ? 'fill-fuchsia-400' : ''}`} />
                          </button>
                          <span className="text-[9px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2.5 py-0.5 rounded-full">
                            {book.category}
                          </span>
                        </div>
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
                      <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3 mb-4 font-medium">
                        {book.description || 'No summary has been generated for this index entry.'}
                      </p>

                      {/* AI-generated tags */}
                      {book.tags && book.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-5">
                          {book.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] font-bold text-fuchsia-300 bg-fuchsia-500/5 border border-fuchsia-500/15 px-2 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
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

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2.5">
                      {/* Borrow control */}
                      {renderBorrowControl(book.id)}

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
                  </div>
                );
              })}
            </div>

            {/* Pagination controls (text mode only) */}
            {searchMode === 'text' && totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center space-x-1 bg-neutral-900 border border-neutral-850 hover:border-violet-500/30 text-neutral-300 hover:text-white font-bold py-2 px-3 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && p - arr[idx - 1] > 1 && (
                        <span className="text-neutral-600 text-xs px-1">…</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          p === page
                            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/10'
                            : 'bg-neutral-900 border border-neutral-850 text-neutral-400 hover:text-white hover:border-violet-500/30'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center space-x-1 bg-neutral-900 border border-neutral-850 hover:border-violet-500/30 text-neutral-300 hover:text-white font-bold py-2 px-3 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
