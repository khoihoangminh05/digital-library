'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { 
  ArrowLeft, 
  Loader2, 
  AlertTriangle, 
  BookOpen, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Wifi,
  WifiOff,
  RefreshCw,
  GraduationCap,
  Sparkles,
  Send,
  X,
  MessageSquare,
  Star
} from 'lucide-react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import dynamic from 'next/dynamic';

// Dynamically import PDFViewer to disable SSR
const PDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-neutral-900 text-white">
      <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold animate-pulse">
        Initializing PDF engine...
      </span>
    </div>
  ),
});

type SyncStatus = 'connecting' | 'connected' | 'synced' | 'disconnected' | 'error';

interface TutorMessage {
  role: 'user' | 'tutor';
  content: string;
  contextText?: string;
}

export default function BookReaderPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState<string>('Publication Reader');
  const [bookInsights, setBookInsights] = useState<{ description?: string; tags?: string[]; keyConcepts?: string[] }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  
  // Progress states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [inputValue, setInputValue] = useState<string>('1');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const [userId, setUserId] = useState<string | null>(null);

  // AI Tutor States
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [highlightedText, setHighlightedText] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [activeContext, setActiveContext] = useState<string>('');
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [tutorInput, setTutorInput] = useState<string>('');
  const [tutorLoading, setTutorLoading] = useState<boolean>(false);

  // Book Reviews States
  const [sidebarTab, setSidebarTab] = useState<'tutor' | 'reviews' | 'insights'>('tutor');
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submitReviewLoading, setSubmitReviewLoading] = useState<boolean>(false);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchReviews = async () => {
    setReviewsLoading(true);
    setReviewError(null);
    try {
      const res = await api.get(`/books/${id}/reviews`);
      setReviews(res.data);
    } catch (err: any) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (sidebarOpen && sidebarTab === 'reviews' && id) {
      fetchReviews();
    }
  }, [sidebarOpen, sidebarTab, id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim() || submitReviewLoading) return;
    setSubmitReviewLoading(true);
    setReviewError(null);
    try {
      const res = await api.post(`/books/${id}/reviews`, {
        rating: reviewRating,
        comment: reviewComment.trim()
      });
      setReviews(prev => [res.data, ...prev]);
      setReviewComment('');
      setReviewRating(5);
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      const errMsg = err.response?.data?.message || 'Failed to submit review. Please ensure you are logged in.';
      setReviewError(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
    } finally {
      setSubmitReviewLoading(false);
    }
  };

  const socketRef = useRef<Socket | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch initial details and progress
  useEffect(() => {
    const fetchReaderDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get user from local storage
        if (typeof window !== 'undefined') {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            setUserId(user.id);
          }
        }

        // Fetch metadata to show book title and AI insights
        const metaRes = await api.get(`/books/${id}`);
        setBookTitle(metaRes.data.title);
        setBookInsights({
          description: metaRes.data.description,
          tags: metaRes.data.tags,
          keyConcepts: metaRes.data.keyConcepts,
        });

        // Fetch initial reading progress
        try {
          const progressRes = await api.get(`/books/${id}/progress`);
          if (progressRes.data && typeof progressRes.data.currentPage === 'number') {
            const page = progressRes.data.currentPage;
            setCurrentPage(page);
            setInputValue(page.toString());
          }
        } catch (progressErr) {
          console.warn('Could not fetch initial reading progress, defaulting to page 1:', progressErr);
        }

        // Use backend streaming URL to bypass S3 CORS issues
        const token = localStorage.getItem('token');
        if (token) {
          const backendUrl = api.defaults.baseURL || 'http://localhost:3002';
          setPdfUrl(`${backendUrl}/books/file-stream/${id}?token=${token}`);
        } else {
          setError('Authorization token is missing. Please log in again.');
        }
      } catch (err: any) {
        console.error(err);
        const msg = err.response?.data?.message || 'Unauthorized or unable to load document reader.';
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchReaderDetails();
    }
  }, [id]);

  // WebSocket Connection Lifecycle
  useEffect(() => {
    if (!id || !userId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    setSyncStatus('connecting');

    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('Successfully connected to progress gateway.');
      setSyncStatus('connected');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from progress gateway.');
      setSyncStatus('disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setSyncStatus('error');
    });

    socketRef.current = socket;

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [id, userId]);

  // Highlight selection listener
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection) return;

      const text = selection.toString().trim();
      if (text.length > 0) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          setTooltipPos({
            top: rect.top + window.scrollY - 46,
            left: rect.left + window.scrollX + rect.width / 2,
          });
          setHighlightedText(text);
          setShowTooltip(true);
        } catch (e) {
          // Bounding rect failed
        }
      } else {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Scroll chat to bottom on updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tutorMessages, tutorLoading]);

  // Emit progress updates to backend
  const emitProgressUpdate = (page: number) => {
    if (!userId || !id) return;

    if (socketRef.current && socketRef.current.connected) {
      setSyncStatus('connected');
      socketRef.current.emit('progress_update', {
        userId,
        bookId: id,
        currentPage: page,
      });

      // Show temporary synced state
      setSyncStatus('synced');
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        setSyncStatus('connected');
      }, 2000);
    } else {
      console.warn('Socket not connected. Progress not synced in real-time.');
      setSyncStatus('error');
    }
  };

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const nextP = currentPage - 1;
      setCurrentPage(nextP);
      setInputValue(nextP.toString());
      emitProgressUpdate(nextP);
    }
  };

  const handleNextPage = () => {
    if (totalPages && currentPage >= totalPages) return;
    const nextP = currentPage + 1;
    setCurrentPage(nextP);
    setInputValue(nextP.toString());
    emitProgressUpdate(nextP);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlurOrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed > 0 && (!totalPages || parsed <= totalPages)) {
      setCurrentPage(parsed);
      emitProgressUpdate(parsed);
    } else {
      setInputValue(currentPage.toString());
    }
  };

  const handleAskAI = () => {
    setActiveContext(highlightedText);
    setSidebarOpen(true);
    setShowTooltip(false);
    
    // Clear selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  };

  const handleTutorSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorInput.trim() || tutorLoading) return;

    const query = tutorInput.trim();
    const currentContext = activeContext;

    // Add user message to state
    setTutorMessages(prev => [...prev, {
      role: 'user',
      content: query,
      contextText: currentContext || undefined,
    }]);

    setTutorInput('');
    setTutorLoading(true);
    // Clear context once used to prevent carrying over to subsequent chat turns
    setActiveContext('');

    try {
      const res = await api.post('/ai/tutor', {
        bookId: id,
        highlightedText: currentContext || 'No highlighted context provided.',
        question: query,
      });

      setTutorMessages(prev => [...prev, {
        role: 'tutor',
        content: res.data.response || 'No explanation generated.',
      }]);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to reach AI Tutor. Please verify backend connection.';
      setTutorMessages(prev => [...prev, {
        role: 'tutor',
        content: `Error: ${Array.isArray(errMsg) ? errMsg.join(', ') : errMsg}`,
      }]);
    } finally {
      setTutorLoading(false);
    }
  };

  // Helper to render sync badge
  const renderSyncBadge = () => {
    switch (syncStatus) {
      case 'synced':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced</span>
          </div>
        );
      case 'connected':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-medium">
            <Wifi className="w-3.5 h-3.5 animate-pulse text-violet-400" />
            <span>Sync Active</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Connecting</span>
          </div>
        );
      case 'disconnected':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 text-[10px] font-medium">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline</span>
          </div>
        );
      case 'error':
      default:
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Sync Fail</span>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-white overflow-hidden font-sans relative">
      {/* Ask AI Floating Tooltip */}
      {showTooltip && (
        <button
          onClick={handleAskAI}
          style={{
            position: 'absolute',
            top: `${tooltipPos.top}px`,
            left: `${tooltipPos.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 1000,
          }}
          className="flex items-center space-x-2 px-3.5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-black rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all animate-in fade-in zoom-in-95 duration-150 cursor-pointer shadow-violet-500/10 border border-violet-500/20"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Ask AI Tutor</span>
        </button>
      )}

      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-neutral-900 bg-neutral-950/70 backdrop-blur-xl px-6 flex items-center justify-between z-10 flex-shrink-0">
        {/* Left Actions */}
        <div className="flex items-center space-x-4">
          <Link 
            href="/books" 
            className="flex items-center space-x-2 text-xs text-neutral-450 hover:text-white transition-all py-2 px-3 bg-neutral-900/40 border border-neutral-900 hover:border-neutral-800 rounded-xl font-bold shadow-inner"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-violet-400" />
            <span>Back to Catalog</span>
          </Link>
          <div className="h-4 w-px bg-neutral-900" />
          <h1 className="text-xs font-black text-neutral-205 flex items-center space-x-2 truncate max-w-xs sm:max-w-md">
            <BookOpen className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span className="truncate">{bookTitle}</span>
          </h1>
        </div>

        {/* Center Page Controls */}
        {!loading && !error && pdfUrl && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-neutral-950 border border-neutral-900 rounded-xl p-1 shadow-inner">
              <button 
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <form onSubmit={handleInputBlurOrSubmit} className="flex items-center px-1">
                <span className="text-[10px] text-neutral-500 font-extrabold mr-1">PAGE</span>
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlurOrSubmit}
                  className="w-10 bg-neutral-900 border border-neutral-850 hover:border-neutral-800 focus:border-violet-500 focus:outline-none rounded-lg py-1 px-1 text-center text-xs font-extrabold text-white transition-colors"
                />
                {totalPages && (
                  <span className="text-xs text-neutral-500 font-bold ml-1">
                    / {totalPages}
                  </span>
                )}
              </form>

              <button 
                onClick={handleNextPage}
                disabled={totalPages !== null && currentPage >= totalPages}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {renderSyncBadge()}
          </div>
        )}
        
        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {!loading && !error && pdfUrl && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`flex items-center space-x-1.5 text-xs font-bold py-2 px-4 rounded-xl border transition-all cursor-pointer ${
                sidebarOpen 
                  ? 'bg-violet-600/10 border-violet-500/30 text-violet-300' 
                  : 'bg-neutral-900/40 border-neutral-900 hover:border-neutral-800 text-neutral-450 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>AI Tutor</span>
            </button>
          )}

          {pdfUrl && (
            <a 
              href={pdfUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center space-x-1.5 text-xs font-bold text-neutral-450 hover:text-violet-400 transition-colors py-2 px-3 rounded-xl border border-transparent hover:border-neutral-900 hover:bg-neutral-900/20"
            >
              <span>Download</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-grow w-full flex overflow-hidden">
        {/* PDF Reader Viewport */}
        <main className="flex-grow h-full relative bg-neutral-950 transition-all duration-300">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
              <span className="text-xs text-neutral-500 uppercase tracking-widest font-black animate-pulse">
                Authorizing S3 download token...
              </span>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500/40 mb-4 animate-pulse" />
              <h3 className="text-base font-bold text-white mb-2">Access Denied</h3>
              <p className="text-neutral-500 text-sm max-w-sm leading-relaxed mb-6">
                {error}
              </p>
              <Link 
                href="/books" 
                className="bg-violet-600 hover:bg-violet-550 text-white font-extrabold py-3 px-6 rounded-xl text-xs transition-colors shadow-lg shadow-violet-500/10 cursor-pointer"
              >
                Back to Catalog
              </Link>
            </div>
          ) : pdfUrl ? (
            <PDFViewer 
              url={pdfUrl} 
              currentPage={currentPage}
              onLoadSuccess={(num) => setTotalPages(num)}
            />
          ) : null}
        </main>

        {/* Collapsible AI Tutor Sidebar */}
        <aside 
          className={`h-full border-l border-neutral-900 bg-neutral-950/65 backdrop-blur-xl flex flex-col transition-all duration-300 z-10 flex-shrink-0 ${
            sidebarOpen ? 'w-80 md:w-96' : 'w-0 border-l-0 overflow-hidden'
          }`}
        >
          {sidebarOpen && (
            <div className="flex flex-col h-full w-full">
              {/* Sidebar Tabs */}
              <div className="h-14 border-b border-neutral-900 px-4 flex items-center justify-between flex-shrink-0">
                <div className="flex space-x-2 bg-neutral-950 p-1 rounded-lg border border-neutral-900">
                  <button
                    onClick={() => setSidebarTab('tutor')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      sidebarTab === 'tutor'
                        ? 'bg-neutral-900 text-violet-300 border border-neutral-800'
                        : 'text-neutral-500 hover:text-neutral-350'
                    }`}
                  >
                    AI Tutor
                  </button>
                  <button
                    onClick={() => setSidebarTab('reviews')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      sidebarTab === 'reviews'
                        ? 'bg-neutral-900 text-violet-300 border border-neutral-800'
                        : 'text-neutral-500 hover:text-neutral-350'
                    }`}
                  >
                    Reviews
                  </button>
                  <button
                    onClick={() => setSidebarTab('insights')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      sidebarTab === 'insights'
                        ? 'bg-neutral-900 text-violet-300 border border-neutral-800'
                        : 'text-neutral-500 hover:text-neutral-350'
                    }`}
                  >
                    Insights
                  </button>
                </div>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {sidebarTab === 'tutor' ? (
                <>
                  {/* Chat Messages */}
                  <div className="flex-grow p-4 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-neutral-900">
                    {tutorMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                        <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl text-violet-400">
                          <MessageSquare className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-black text-neutral-300 uppercase tracking-wider">Ask a Question</p>
                        <p className="text-[11px] text-neutral-550 max-w-xs leading-relaxed font-semibold">
                          Highlight any sentence in the book and click <strong className="text-violet-400 font-extrabold">"Ask AI Tutor"</strong> to explain that specific passage, or type a general query below.
                        </p>
                      </div>
                    ) : (
                      tutorMessages.map((msg, index) => (
                        <div 
                          key={index} 
                          className={`flex flex-col space-y-1.5 max-w-[85%] ${
                            msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                          }`}
                        >
                          {msg.contextText && (
                            <div className="text-[10px] text-violet-400 bg-violet-950/20 border border-violet-900/20 rounded-xl p-2.5 max-w-full italic font-semibold leading-relaxed border-l-2 border-l-violet-500">
                              Context: "{msg.contextText}"
                            </div>
                          )}
                          
                          <div className={`text-xs p-3.5 rounded-2xl leading-relaxed shadow-md font-medium ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-r from-violet-650 to-fuchsia-650 text-white rounded-tr-none'
                              : 'bg-neutral-900/60 text-neutral-200 rounded-tl-none border border-neutral-900'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))
                    )}
                    {tutorLoading && (
                      <div className="flex items-center space-x-2 bg-neutral-900/40 text-neutral-400 p-3.5 rounded-2xl rounded-tl-none border border-neutral-900 max-w-[80%]">
                        <Loader2 className="w-3.5 h-3.5 text-violet-455 animate-spin" />
                        <span className="text-[11px] font-black tracking-wider uppercase animate-pulse">Tutor thinking...</span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Sidebar Input Area */}
                  <div className="p-4 border-t border-neutral-900 bg-neutral-950/40 flex flex-col space-y-3 flex-shrink-0">
                    {activeContext && (
                      <div className="flex items-start justify-between bg-violet-950/20 border border-violet-900/20 rounded-xl p-2.5 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="flex-grow text-[10px] text-neutral-300 pr-2 leading-relaxed font-semibold">
                          <span className="text-violet-400 font-extrabold block mb-1">Passage Context Selected:</span>
                          <span className="italic block line-clamp-3">"{activeContext}"</span>
                        </div>
                        <button 
                          onClick={() => setActiveContext('')}
                          className="p-0.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                          title="Clear Context"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleTutorSend} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={tutorInput}
                        onChange={(e) => setTutorInput(e.target.value)}
                        placeholder={activeContext ? "Ask about selected text..." : "Ask AI Tutor a question..."}
                        className="flex-grow bg-neutral-900 border border-neutral-850 hover:border-neutral-800 focus:border-violet-500 focus:outline-none rounded-xl py-3 px-3.5 text-xs text-white placeholder-neutral-600 transition-all font-semibold"
                      />
                      <button
                        type="submit"
                        disabled={!tutorInput.trim() || tutorLoading}
                        className="p-3 rounded-xl bg-violet-650 hover:bg-violet-600 text-white disabled:opacity-40 disabled:hover:bg-violet-650 cursor-pointer shadow-md transition-all active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </>
              ) : sidebarTab === 'reviews' ? (
                <>
                  {/* Reviews Content */}
                  <div className="flex-grow p-4 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-neutral-900 flex flex-col">
                    {reviewError && (
                      <div className="flex items-start space-x-2 bg-red-500/10 border border-red-500/20 text-red-400 px-3.5 py-2.5 rounded-xl text-[11px] font-bold mb-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{reviewError}</span>
                      </div>
                    )}

                    {reviewsLoading ? (
                      <div className="flex-grow flex flex-col items-center justify-center py-10 space-y-2">
                        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider animate-pulse">Loading reviews...</span>
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="flex-grow flex flex-col items-center justify-center py-10 text-center space-y-2">
                        <Star className="w-8 h-8 text-neutral-800" />
                        <h4 className="text-xs font-black text-neutral-350 uppercase">No Reviews Yet</h4>
                        <p className="text-[11px] text-neutral-550 max-w-[200px]">Be the first to share your thoughts about this book below.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 flex-grow flex flex-col">
                        {/* Rating Summary */}
                        <div className="bg-neutral-900/40 border border-neutral-900 p-4 rounded-xl flex items-center justify-between mb-2 flex-shrink-0">
                          <span className="text-xs font-bold text-neutral-300">Reader Rating</span>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-sm font-black text-white">
                              {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)}
                            </span>
                            <div className="flex text-amber-400">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                            </div>
                            <span className="text-[10px] text-neutral-500 font-semibold">({reviews.length} reviews)</span>
                          </div>
                        </div>

                        {/* Reviews list */}
                        <div className="space-y-3.5 overflow-y-auto pr-1 flex-grow">
                          {reviews.map((rev) => (
                            <div key={rev.id} className="border-b border-neutral-900 pb-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] text-neutral-400 font-extrabold truncate max-w-[155px]">
                                  {rev.userEmail}
                                </span>
                                <div className="flex text-amber-400 space-x-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`w-3 h-3 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-850'}`} 
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-[11px] text-neutral-350 font-medium leading-relaxed break-words">
                                {rev.comment}
                              </p>
                              <span className="text-[9px] text-neutral-600 block mt-1 font-semibold">
                                {new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar Submit Review Form */}
                  <div className="p-4 border-t border-neutral-900 bg-neutral-950/40 flex-shrink-0 flex flex-col space-y-3">
                    <form onSubmit={handleSubmitReview} className="space-y-3">
                      {/* Rating stars selector */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-neutral-400 uppercase">Your Rating</span>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="text-amber-450 hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Star className={`w-4.5 h-4.5 ${star <= reviewRating ? 'fill-amber-400 text-amber-405' : 'text-neutral-850'}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment Input */}
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Write a brief review..."
                          className="flex-grow bg-neutral-900 border border-neutral-850 hover:border-neutral-800 focus:border-violet-500 focus:outline-none rounded-xl py-3 px-3.5 text-xs text-white placeholder-neutral-600 transition-all font-semibold"
                        />
                        <button
                          type="submit"
                          disabled={!reviewComment.trim() || submitReviewLoading}
                          className="p-3 rounded-xl bg-violet-650 hover:bg-violet-600 text-white disabled:opacity-40 disabled:hover:bg-violet-650 cursor-pointer shadow-md transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
                        >
                          {submitReviewLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              ) : (
                <>
                  {/* AI Insights Content */}
                  <div className="flex-grow p-5 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-neutral-900">
                    {/* AI Summary */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-300">AI Summary</h4>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed font-medium whitespace-pre-wrap">
                        {bookInsights.description || 'No AI summary has been generated for this publication yet.'}
                      </p>
                    </div>

                    {/* Key Concepts */}
                    {bookInsights.keyConcepts && bookInsights.keyConcepts.length > 0 && (
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <GraduationCap className="w-3.5 h-3.5 text-fuchsia-400" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-300">Key Concepts</h4>
                        </div>
                        <ul className="space-y-1.5">
                          {bookInsights.keyConcepts.map((concept, i) => (
                            <li key={i} className="flex items-start space-x-2 text-[11px] text-neutral-400 font-medium">
                              <span className="text-violet-500 mt-0.5">•</span>
                              <span>{concept}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tags */}
                    {bookInsights.tags && bookInsights.tags.length > 0 && (
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <Star className="w-3.5 h-3.5 text-amber-400" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-300">Tags</h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {bookInsights.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-bold text-fuchsia-300 bg-fuchsia-500/5 border border-fuchsia-500/15 px-2.5 py-1 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
