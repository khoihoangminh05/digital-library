'use client';

import React from 'react';
import { Newspaper, Calendar, Sparkles, Database, Cpu, ArrowRight, ShieldCheck } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  category: string;
  date: string;
  content: string;
  icon: any;
  tagColor: string;
}

export default function LibraryNewsPage() {
  const newsList: NewsItem[] = [
    {
      id: 'news-1',
      title: 'Gemini 2.5 Flash Lite Model Integration Completed',
      category: 'AI Summary Engine',
      date: 'May 31, 2026',
      content: 'Background document processing, indexing, and map-reduce summarization are now fully optimized using gemini-2.5-flash-lite. Enjoy sub-second book summary generation and auto-tag extraction directly on PDF imports.',
      icon: Cpu,
      tagColor: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
    },
    {
      id: 'news-2',
      title: 'Vector Search Space Refined to 1536 Dimensions',
      category: 'Semantic Search',
      date: 'May 28, 2026',
      content: 'Our database vector space has been successfully migrated to store high-dimensional 1536-dimensional embeddings. Standardized search matching resolves semantic similarity using native pgvector cosine distances.',
      icon: Sparkles,
      tagColor: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/25',
    },
    {
      id: 'news-3',
      title: 'WebSocket Real-time Reading Progress Sync Enabled',
      category: 'Feature Update',
      date: 'May 25, 2026',
      content: 'Read seamlessly across multiple devices. Your current page is dynamically broadcasted via WebSockets, cached instantly in Redis, and periodically saved to PostgreSQL to optimize server database performance.',
      icon: Database,
      tagColor: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    },
    {
      id: 'news-4',
      title: 'Transients Token S3 Streaming Security Upgrade',
      category: 'Security',
      date: 'May 20, 2026',
      content: 'Secure your downloads. All PDF documents are served dynamically using temporary query-authenticated tokens through an internal proxy streaming gateway, avoiding raw S3 URL exposure and CORS errors.',
      icon: ShieldCheck,
      tagColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full flex-grow relative z-10">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      
      {/* Header */}
      <div className="mb-12 relative z-10">
        <div className="flex items-center space-x-2 text-violet-400 mb-3">
          <Newspaper className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-wider bg-violet-500/10 border border-violet-500/25 px-3 py-1 rounded-full">
            News & Announcements
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
          Library Updates
        </h1>
        <p className="text-neutral-400 text-sm mt-3 font-semibold leading-relaxed">
          Stay informed about the latest features, system upgrades, and additions to our digital vector archive catalog.
        </p>
      </div>

      {/* News timeline */}
      <div className="space-y-8 relative z-10">
        {newsList.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="glass-panel rounded-2xl p-6 hover:border-violet-500/20 transition-all duration-300 group hover:-translate-y-0.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform duration-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className={`text-[9px] font-black uppercase tracking-wider border px-2.5 py-0.5 rounded-full ${item.tagColor}`}>
                      {item.category}
                    </span>
                    <h2 className="text-base font-extrabold text-white mt-1 group-hover:text-violet-300 transition-colors">
                      {item.title}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center text-xs text-neutral-500 font-bold space-x-1.5 self-start sm:self-center">
                  <Calendar className="w-4 h-4 text-neutral-600" />
                  <span>{item.date}</span>
                </div>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed font-semibold pl-0 sm:pl-13">
                {item.content}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
