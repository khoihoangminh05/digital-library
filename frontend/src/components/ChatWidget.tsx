'use client';

import React, { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Sparkles, X, Send, Loader2, Bot, MessageSquare } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Recommend a book for a rainy day',
  'I want something about databases',
  'Explain machine learning basics',
];

export const ChatWidget: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  if (!isAuthenticated) return null;

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: trimmed, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.response || 'No response generated.' }]);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to reach the AI assistant.';
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${Array.isArray(msg) ? msg.join(', ') : msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-xl shadow-violet-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        aria-label="Open AI assistant"
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] sm:w-96 h-[32rem] max-h-[70vh] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-950/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-900 flex-shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg text-violet-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">Library AI Assistant</h3>
                <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Multi-agent · Librarian + Researcher</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-neutral-900">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl text-violet-400">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <p className="text-xs font-black text-neutral-300 uppercase tracking-wider">Ask me anything</p>
                <p className="text-[11px] text-neutral-500 max-w-[220px] leading-relaxed font-semibold">
                  I can recommend books based on your mood, or answer general knowledge questions.
                </p>
                <div className="flex flex-col gap-2 w-full pt-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-[11px] text-neutral-300 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-violet-500/30 rounded-xl px-3 py-2 text-left transition-all cursor-pointer font-semibold"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <div
                    className={`text-xs p-3.5 rounded-2xl leading-relaxed shadow-md font-medium whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-violet-650 to-fuchsia-650 text-white rounded-tr-none'
                        : 'bg-neutral-900/60 text-neutral-200 rounded-tl-none border border-neutral-900'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-center space-x-2 bg-neutral-900/40 text-neutral-400 p-3.5 rounded-2xl rounded-tl-none border border-neutral-900 max-w-[80%]">
                <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                <span className="text-[11px] font-black tracking-wider uppercase animate-pulse">Thinking...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-neutral-900 flex items-center space-x-2 flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the library assistant..."
              className="flex-grow bg-neutral-900 border border-neutral-850 hover:border-neutral-800 focus:border-violet-500 focus:outline-none rounded-xl py-3 px-3.5 text-xs text-white placeholder-neutral-600 transition-all font-semibold"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-3 rounded-xl bg-violet-650 hover:bg-violet-600 text-white disabled:opacity-40 disabled:hover:bg-violet-650 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
