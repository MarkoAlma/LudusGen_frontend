import React from 'react';
import { Globe, Code, Image, Music, Box, Hash, Rss } from 'lucide-react';

const CATEGORIES = [
  { id: "all", label: "All", color: "#6366f1", threads: 5241, online: 203, icon: Globe },
  { id: "code", label: "Code AI", color: "#34d399", threads: 893, online: 31, description: "GitHub Copilot, Cursor...", icon: Code },
  { id: "image", label: "Image AI", color: "#f472b6", threads: 2156, online: 89, description: "Midjourney, DALL-E...", icon: Image },
  { id: "audio", label: "Audio AI", color: "#fb923c", threads: 612, online: 24, description: "Suno, Udio, ElevenLabs...", icon: Music },
  { id: "threed", label: "3D AI", color: "#38bdf8", threads: 296, online: 12, description: "Meshy, Tripo3D...", icon: Box },
];

const GlassPanel = ({ children, className = "" }) => (
  <div
    className={`p-6 rounded-[1.5rem] border border-white/5 shadow-2xl ${className}`}
    style={{ background: "rgba(10,10,25,0.4)", backdropFilter: "blur(20px)" }}
  >
    {children}
  </div>
);

export default function ForumSidebar({ selectedCategory, setSelectedCategory }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <GlassPanel>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
            <Rss className="w-3.5 h-3.5 text-primary" /> Categories
          </h3>
          <span className="text-[10px] font-bold text-gray-700 uppercase">{CATEGORIES.find(c => c.id === "all").online} Online</span>
        </div>
        <div className="space-y-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon || Hash;
            const active = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full flex flex-col p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all group ${
                  active
                    ? 'bg-primary/10 border-primary/20 text-white'
                    : 'hover:bg-white/5 text-gray-400 border-transparent'
                } border`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-xl border"
                      style={{ background: `${cat.color}13`, borderColor: `${cat.color}24`, color: cat.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-bold">{cat.label}</span>
                  </div>
                  {active ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(138,43,226,0.8)]" />
                  ) : (
                    <span className="text-[10px] font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">{cat.threads}</span>
                  )}
                </div>
                {cat.description && !active && (
                  <p className="text-left text-[9px] text-gray-600 mt-1 pl-10 group-hover:text-gray-500 transition-colors">{cat.description}</p>
                )}
              </button>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
}
