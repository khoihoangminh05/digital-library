'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { BookOpen, UploadCloud, Loader2, AlertTriangle, CheckCircle2, ArrowLeft, Image as ImageIcon, FileText } from 'lucide-react';
import Link from 'next/link';

export default function AddBookPage() {
  const router = useRouter();
  
  // Form states
  const [title, setTitle] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Artificial Intelligence');
  const [cover, setCover] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  
  // Feedback states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim() || !author.trim() || !category.trim()) {
      setError('Title, Author, and Category are required fields.');
      return;
    }

    if (!file) {
      setError('Please upload a Book File (PDF/EPUB).');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('author', author);
      formData.append('description', description);
      formData.append('category', category);
      
      if (cover) {
        formData.append('cover', cover);
      }
      
      formData.append('file', file);

      await api.post('/books', formData, {
        headers: {
          'Content-Type': undefined,
        },
      });

      setSuccess('Publication successfully uploaded and indexed! Redirecting...');
      
      // Clear form
      setTitle('');
      setAuthor('');
      setDescription('');
      setCover(null);
      setFile(null);

      // Redirect back to dashboard
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 2000);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        const msg = err.response.data.message;
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      } else {
        setError('Failed to upload publication. Please verify S3 settings and backend connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow flex flex-col justify-center">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/admin/dashboard" className="inline-flex items-center space-x-2 text-sm text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 text-violet-400" />
          <span>Back to Console</span>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          Publish New Book
        </h1>
        <p className="text-neutral-400 text-sm mt-1">
          Upload file documents, cover images, and index them into the similarity search database.
        </p>
      </div>

      {/* Card */}
      <div className="bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl p-6 sm:p-10 relative">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Success Alert */}
        {success && (
          <div className="mb-6 flex items-start space-x-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400 animate-bounce" />
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2" htmlFor="title">
                Book Title *
              </label>
              <input
                id="title"
                type="text"
                required
                placeholder="e.g. Introduction to Vector Search"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl py-3 px-4 text-sm text-white placeholder-neutral-600 outline-none transition-all duration-200"
              />
            </div>

            {/* Author */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2" htmlFor="author">
                Author *
              </label>
              <input
                id="author"
                type="text"
                required
                placeholder="e.g. Dr. Sarah Connor"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl py-3 px-4 text-sm text-white placeholder-neutral-600 outline-none transition-all duration-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2" htmlFor="category">
                Classification Category *
              </label>
              <div className="relative">
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl py-3 px-4 text-sm text-white outline-none appearance-none cursor-pointer transition-all duration-200"
                >
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Databases">Databases</option>
                  <option value="Frontend Web Development">Frontend Web Development</option>
                  <option value="DevOps & Security">DevOps & Security</option>
                  <option value="Other">Other Category</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="md:row-span-2">
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2" htmlFor="description">
                Short Description
              </label>
              <textarea
                id="description"
                placeholder="A brief metadata overview of the publication content..."
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl py-3 px-4 text-sm text-white placeholder-neutral-600 outline-none resize-none transition-all duration-200 h-[calc(100%-2rem)] min-h-[120px]"
              />
            </div>
          </div>

          {/* Files Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cover Image Upload */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                Cover Image (PNG/JPG)
              </label>
              <div className="flex justify-center items-center w-full">
                <label className="flex flex-col justify-center items-center w-full h-32 bg-neutral-950 rounded-xl border border-dashed border-neutral-800 hover:border-violet-500/50 cursor-pointer transition-all duration-200 group">
                  <div className="flex flex-col justify-center items-center pt-5 pb-6 text-neutral-500 group-hover:text-neutral-400">
                    <ImageIcon className="w-8 h-8 mb-2 text-neutral-600 group-hover:text-violet-400 transition-colors" />
                    <p className="text-xs font-medium">
                      {cover ? (
                        <span className="text-violet-400 font-bold max-w-[180px] truncate block">{cover.name}</span>
                      ) : (
                        <span>Upload Cover Art</span>
                      )}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setCover(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Book File Upload */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                Publication Document (PDF/EPUB) *
              </label>
              <div className="flex justify-center items-center w-full">
                <label className="flex flex-col justify-center items-center w-full h-32 bg-neutral-950 rounded-xl border border-dashed border-neutral-800 hover:border-violet-500/50 cursor-pointer transition-all duration-200 group">
                  <div className="flex flex-col justify-center items-center pt-5 pb-6 text-neutral-500 group-hover:text-neutral-400">
                    <UploadCloud className="w-8 h-8 mb-2 text-neutral-600 group-hover:text-violet-400 transition-colors" />
                    <p className="text-xs font-medium">
                      {file ? (
                        <span className="text-violet-400 font-bold max-w-[180px] truncate block">{file.name}</span>
                      ) : (
                        <span>Upload Document (.pdf, .epub)</span>
                      )}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.epub"
                    required
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-200 active:scale-[0.99] disabled:scale-100 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Uploading S3 Bucket & Indexing...</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-5 h-5" />
                  <span>Publish and Index Publication</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
