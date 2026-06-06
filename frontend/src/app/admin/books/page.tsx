'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  ArrowLeft,
  BookMarked
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

export default function AdminBooksListPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Delete Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Fetch books from API
  const fetchBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/books');
      setBooks(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch publication archives. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Handle opening delete modal
  const openDeleteModal = (book: Book) => {
    setSelectedBook(book);
    setDeleteModalOpen(true);
  };

  // Handle closing delete modal
  const closeDeleteModal = () => {
    setSelectedBook(null);
    setDeleteModalOpen(false);
  };

  // Handle confirming delete
  const handleDeleteConfirm = async () => {
    if (!selectedBook) return;
    
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.delete(`/books/${selectedBook.id}`);
      setSuccess(`"${selectedBook.title}" successfully deleted and purged from S3.`);
      
      // Update books list in state without full re-fetch
      setBooks(prev => prev.filter(b => b.id !== selectedBook.id));
      
      // Auto close modal
      closeDeleteModal();

      // Clear success notification after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to delete publication. Please verify permissions.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      closeDeleteModal();
    } finally {
      setDeleting(false);
    }
  };

  // Filtered books list based on search query
  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow flex flex-col relative">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/admin/dashboard" className="inline-flex items-center space-x-2 text-sm text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 text-violet-400" />
          <span>Back to Console</span>
        </Link>
      </div>

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Manage Publications
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Browse, search, edit metadata, or purge books and S3 objects from the digital library database.
          </p>
        </div>
        
        <div>
          <Link href="/admin/books/add">
            <button className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-violet-500/10 transition-all duration-200 cursor-pointer text-sm">
              <Plus className="w-4 h-4" />
              <span>Add Publication</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="mb-6 flex items-start space-x-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
          <span className="font-medium leading-tight">{success}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 flex items-start space-x-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="font-medium leading-tight">{error}</span>
        </div>
      )}

      {/* Toolbar / Search */}
      <div className="bg-neutral-900/30 border border-neutral-850 rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by title, author, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-neutral-600 outline-none transition-all duration-200"
          />
        </div>
        <div className="text-neutral-500 text-xs font-semibold uppercase tracking-wider pr-2">
          Total: {filteredBooks.length} Publications
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-neutral-900/20 border border-neutral-800 rounded-2xl overflow-hidden flex-grow flex flex-col justify-between">
        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold animate-pulse">
              Querying database registry...
            </span>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
            <BookMarked className="w-16 h-16 text-neutral-700 mb-4" />
            <h3 className="text-base font-bold text-white mb-1">No publications found</h3>
            <p className="text-neutral-500 text-xs max-w-xs leading-relaxed">
              {searchQuery ? 'No publications matched your search query.' : 'Get started by creating your first digital publication indexing record.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/40 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-6 w-20">Cover</th>
                  <th className="py-4 px-6">Title & Description</th>
                  <th className="py-4 px-6 w-48">Author</th>
                  <th className="py-4 px-6 w-44">Category</th>
                  <th className="py-4 px-6 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-sm">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-neutral-900/20 transition-colors">
                    {/* Cover art thumbnail */}
                    <td className="py-4 px-6">
                      <div className="w-10 h-14 bg-neutral-950 rounded overflow-hidden border border-neutral-800 flex items-center justify-center relative shadow-md">
                        {book.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={book.coverUrl} 
                            alt={book.title} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback if image fails to load
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <BookOpen className="w-4 h-4 text-neutral-700 absolute" style={{ zIndex: 0 }} />
                      </div>
                    </td>

                    {/* Title & Description */}
                    <td className="py-4 px-6 max-w-sm">
                      <div className="font-bold text-white leading-snug truncate max-w-xs sm:max-w-md">
                        {book.title}
                      </div>
                      <div className="text-xs text-neutral-500 truncate max-w-xs sm:max-w-md mt-1 font-medium">
                        {book.description || 'No metadata description provided.'}
                      </div>
                    </td>

                    {/* Author */}
                    <td className="py-4 px-6 font-medium text-neutral-300">
                      {book.author}
                    </td>

                    {/* Category tag */}
                    <td className="py-4 px-6">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">
                        {book.category}
                      </span>
                    </td>

                    {/* Edit / Delete Buttons */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <Link 
                          href={`/admin/books/edit/${book.id}`}
                          className="p-1.5 text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-850 hover:border-neutral-700 rounded-lg transition-colors cursor-pointer"
                          title="Edit Publication"
                        >
                          <Edit className="w-4 h-4 text-violet-400" />
                        </Link>
                        <button
                          onClick={() => openDeleteModal(book)}
                          className="p-1.5 text-neutral-400 hover:text-red-400 bg-neutral-950 border border-neutral-850 hover:border-red-900/30 rounded-lg transition-colors cursor-pointer"
                          title="Delete Publication"
                        >
                          <Trash2 className="w-4 h-4 text-fuchsia-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-scaleUp">
            <div className="flex items-center space-x-3 text-fuchsia-400 mb-4">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h2 className="text-lg font-bold text-white">Purge Publication</h2>
            </div>
            
            <p className="text-sm text-neutral-400 leading-relaxed mb-6">
              Are you sure you want to delete <span className="text-white font-bold">"{selectedBook.title}"</span>? 
              This will permanently delete the metadata index from PostgreSQL and delete the associated cover image and PDF document files from AWS S3.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-gradient-to-r from-red-600 to-fuchsia-600 hover:from-red-500 hover:to-fuchsia-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-red-500/10 hover:shadow-red-500/20 transition-all duration-200 flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging S3 & DB...</span>
                  </>
                ) : (
                  <span>Purge From System</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
