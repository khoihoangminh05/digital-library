import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-950 border-t border-neutral-900/60 text-neutral-500 py-8 text-xs font-semibold">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <span className="text-neutral-300 font-bold bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-lg">DL</span>
          <span><strong className="text-neutral-300 font-extrabold">Digital Library</strong> — Intelligent AI-indexed vector archive platform.</span>
        </div>
        <div className="text-[11px] text-neutral-600 tracking-wider">
          &copy; {new Date().getFullYear()} Digital Library. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
export default Footer;
