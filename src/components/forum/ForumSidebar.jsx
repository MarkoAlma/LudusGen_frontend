import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Trophy, MessageSquare, ChevronRight, Hash, 
  Rss, Award, Clock
} from 'lucide-react';

const CATEGORIES = [
  { id: "all", label: "Összes", emoji: "🌐", color: "#a78bfa", threads: 5241, online: 203 },
  { id: "chat", label: "Chat AI", emoji: "💬", color: "#a78bfa", threads: 1284, online: 47, description: "GPT, Claude, Gemini..." },
  { id: "code", label: "Code AI", emoji: "🧠", color: "#34d399", threads: 893, online: 31, description: "GitHub Copilot, Cursor..." },
  { id: "image", label: "Kép AI", emoji: "🖼️", color: "#f472b6", threads: 2156, online: 89, description: "Midjourney, DALL·E..." },
];



const RECENT_ACTIVITY = [
  { user: "pixel_witch", action: "hozzászólt", post: "MJ v7 guide", time: "2p", color: "#f472b6" },
  { user: "devmaster_hu", action: "új témát nyitott", post: "Claude tippek", time: "5p", color: "#7c3aed" },
  { user: "beatmaker99", action: "like-olt", post: "Suno promptek", time: "12p", color: "#ea580c" },
];

const GlassPanel = ({ children, className = "" }) => (
  <div className={`p-6 rounded-[1.5rem] border border-white/5 shadow-2xl ${className}`}
       style={{ background: "rgba(10,10,25,0.4)", backdropFilter: "blur(20px)" }}>
    {children}
  </div>
);

export default function ForumSidebar({ selectedCategory, setSelectedCategory }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Categories Panel */}
      <GlassPanel>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
           <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <Rss className="w-3.5 h-3.5 text-primary" /> Kategóriák
           </h3>
           <span className="text-[10px] font-bold text-gray-700 uppercase">{CATEGORIES.find(c => c.id === "all").online} Online</span>
        </div>
        <div className="space-y-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full flex flex-col p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all group ${
                selectedCategory === cat.id
                ? 'bg-primary/10 border-primary/20 text-white'
                : 'hover:bg-white/5 text-gray-400 border-transparent'
              } border`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-base sm:text-lg">{cat.emoji}</span>
                  <span className="text-xs font-bold">{cat.label}</span>
                </div>
                {selectedCategory === cat.id ? (
                   <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(138,43,226,0.8)]" />
                ) : (
                   <span className="text-[10px] font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">{cat.threads}</span>
                )}
              </div>
              {cat.description && selectedCategory !== cat.id && (
                 <p className="text-left text-[9px] text-gray-600 mt-1 pl-7 group-hover:text-gray-500 transition-colors">{cat.description}</p>
              )}
            </button>
          ))}
        </div>
      </GlassPanel>



      {/* Recent Activity */}
      <GlassPanel>
        <h3 className="text-white font-black text-xs uppercase tracking-widest mb-4 sm:mb-6 flex items-center gap-2">
           <TrendingUp className="w-3.5 h-3.5 text-primary" /> Aktivitás
        </h3>
        <div className="space-y-3 sm:space-y-4">
          {RECENT_ACTIVITY.map((act, i) => (
             <div key={i} className="flex gap-2 sm:gap-3 text-[10px] border-b border-white/5 pb-3 sm:pb-4 last:border-0 last:pb-0">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: act.color }} />
                <div className="min-w-0">
                   <p className="text-gray-400 leading-relaxed">
                      <span className="text-white font-black italic">{act.user}</span> {act.action}
                      <span className="text-gray-200 block truncate">"{act.post}"</span>
                   </p>
                   <span className="text-gray-700 font-bold uppercase tracking-tighter flex items-center gap-1 mt-1">
                      <Clock className="w-2.5 h-2.5" /> {act.time}
                   </span>
                </div>
             </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
