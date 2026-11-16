import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#040711]/55 backdrop-blur-md py-6 px-4 text-center font-mono text-[11px] text-slate-400">
      <div className="max-w-6xl mx-auto flex items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>NASA Space Apps Challenge 2026 · Team FlameFrags</span>
        </div>
      </div>
    </footer>
  );
};
