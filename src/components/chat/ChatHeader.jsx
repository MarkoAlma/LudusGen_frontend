import React, { useState, useEffect } from 'react';
import { Menu, Settings2, Sparkles, History, Wifi } from 'lucide-react';

const CONTENT_MAX_W = 'max-w-3xl';

export default function ChatHeader({ selectedModel, setSidebarOpen, setHistorySidebarOpen, onConfigOpen }) {
  const themeColor = selectedModel?.color || "#8b5cf6";
  const [latency, setLatency] = useState(12);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(prev => Math.max(5, Math.min(45, prev + (Math.random() - 0.5) * 8)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="pt-4 lg:pt-5 flex-shrink-0 border-b border-white/5 bg-bg-surface/60 backdrop-blur-xl z-40 relative overflow-hidden">
      {/* Cinematic Border Beam (Forum Sync) */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-60 z-50 transition-opacity group-hover:opacity-100" />
      
      {/* Subtle Bottom Border Overlay */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-white/5" />


      <div className={`mx-auto w-full ${CONTENT_MAX_W} px-6 md:px-8 h-16 flex items-center justify-between relative z-10`}>
        <div className="flex items-center gap-5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="xl:hidden p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-500"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Model avatar with Ring */}
          <div className="relative group/header">
            <div
              className="w-10 h-10 rounded-[1.2rem] flex items-center justify-center border shadow-2xl transition-all duration-700 relative z-10 bg-white/[0.03] backdrop-blur-md"
              style={{
                borderColor: `${themeColor}30`,
                color: themeColor
              }}
            >
              <Sparkles className="w-5 h-5 group-hover/header:scale-110 group-hover/header:rotate-6 transition-all duration-700" />
            </div>
            {/* Glowing Ring */}
            <div
              className="absolute inset-0 rounded-[1.2rem] blur-md opacity-20 scale-110 pointer-events-none"
              style={{ backgroundColor: themeColor }}
            />
          </div>

            <div className="flex flex-col">
               <div className="flex items-center gap-4 mb-1">
                  <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter leading-none group-hover:text-primary transition-colors">
                    {selectedModel?.name || "AI Chat"}
                  </h2>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">System_Live</span>
                  </div>
               </div>


            <div className="flex items-center gap-4 mt-2">
               <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">
                 <Wifi className="w-2.5 h-2.5 text-zinc-600" />
                 <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest leading-none">{Math.round(latency)}MS</span>
               </div>
               <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">
                 <span className="text-[8px] font-black text-zinc-800 uppercase tracking-widest leading-none italic">Buffer: Optimized</span>
               </div>
               <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">
                 <span className="text-[8px] font-black text-emerald-500/50 uppercase tracking-widest leading-none italic">Neural: Stable</span>
               </div>
            </div>

          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setHistorySidebarOpen(true)}
            className="xl:hidden p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-500"
          >
            <History className="w-5 h-5" />
          </button>

          <button
            onClick={onConfigOpen}
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-gray-500 hover:text-white hover:border-white/10 hover:bg-white/5 transition-all duration-500 group/btn"
          >
            <Settings2 className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:inline">Config</span>
          </button>
        </div>
      </div>
    </header>
  );
}
