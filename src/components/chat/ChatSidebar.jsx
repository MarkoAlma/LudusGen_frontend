import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, MessageSquare, Clock, Search, X, ChevronRight } from 'lucide-react';
import { getModel } from '../../ai_components/models';

function groupConversationsByDate(conversations) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const yesterdayStart = todayStart - 86400;
  const weekStart = todayStart - 7 * 86400;

  const groups = { today: [], yesterday: [], thisWeek: [], older: [] };

  conversations.forEach(conv => {
    const ts = conv.updatedAt?.seconds || 0;
    if (ts >= todayStart) groups.today.push(conv);
    else if (ts >= yesterdayStart) groups.yesterday.push(conv);
    else if (ts >= weekStart) groups.thisWeek.push(conv);
    else groups.older.push(conv);
  });

  return groups;
}

export default function ChatSidebar({ conversations, loadingHistory, onSelectSession, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c =>
      (c.title || '').toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const grouped = useMemo(() =>
    groupConversationsByDate(filteredConversations),
    [filteredConversations]
  );

  const groupLabels = [
    { key: 'today', label: 'Ma' },
    { key: 'yesterday', label: 'Tegnap' },
    { key: 'thisWeek', label: 'Ezen a héten' },
    { key: 'older', label: 'Korábbi' },
  ];

  return (
    <div
      className="flex flex-col h-full bg-[#03000a] w-full relative overflow-hidden"
      style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}
    >
      {/* Forum-Matched Atmospheric Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute bottom-[10%] right-[-20%] w-96 h-96 bg-primary/20 blur-[120px] rounded-full" />
      </div>

      {/* Cinematic Tech Grid Overlay (Subtle) */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '16px 16px' }}
      />


      {/* Sidebar Header */}
      <div className="relative z-10 bg-white/[0.04] backdrop-blur-2xl overflow-hidden border-b border-white/5">
        {/* Border Beam overlay */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="px-6 h-20 lg:h-24 flex items-center justify-between">
          <div className="relative">
            <h3 className="text-white text-[12px] font-black uppercase tracking-[0.4em] flex items-center gap-3 italic">
              <History className="w-4 h-4 text-primary" /> Előzmények
            </h3>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-2 ml-7">Beszélgetések</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center rounded bg-white/[0.03] border border-white/10 shadow-[inner_0_1px_0_rgba(255,255,255,0.05)] text-[10px] font-black text-gray-400 group-hover:text-primary transition-colors">
              {conversations.length}
            </div>
          </div>
        </div>
      </div>


      {/* Search Bar */}
      <div className="px-6 py-5 relative z-10">
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-500 group/search ${searchFocused
            ? 'bg-white/[0.04] border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.03)]'
            : 'bg-white/[0.02] border-white/5'
          }`}>
          <Search className={`w-4 h-4 transition-colors duration-500 ${searchFocused ? 'text-white' : 'text-gray-700'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Keresés..."
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-[12px] text-gray-300 placeholder-gray-700 font-bold"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 rounded-lg hover:bg-white/10 text-gray-600 hover:text-white transition-all duration-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 relative z-10 scrollbar-hide">
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-6 h-6 rounded-full border-2 border-white/5 border-t-primary animate-spin mb-4" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Betöltés...</span>
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="space-y-8">
            {groupLabels.map(({ key, label }) => {
              const items = grouped[key];
              if (!items || items.length === 0) return null;
              return (
                <div key={key}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] whitespace-nowrap">{label}</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <div className="space-y-1.5">
                    {items.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => onSelectSession(conv.id)}
                        className="w-full flex items-center gap-4 px-5 py-4 rounded-[1.2rem] text-left border border-white/5 bg-white/[0.01] hover:bg-white/[0.05] hover:border-white/15 transition-all duration-500 group/item relative overflow-hidden shadow-sm hover:shadow-xl"
                      >
                        {/* Hover Border Beam (Mini) */}
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />

                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-[13px] font-black text-white/50 truncate group-hover/item:text-white transition-colors duration-500 italic tracking-tight">
                            {conv.title || 'Untitled_Session'}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap overflow-hidden">
                            {conv.modelName && (
                              <span
                                className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border truncate max-w-[80px] shrink-0"
                                style={{
                                  color: (getModel(conv.modelId)?.color || '#8b5cf6') + '99',
                                  borderColor: (getModel(conv.modelId)?.color || '#8b5cf6') + '33',
                                  backgroundColor: (getModel(conv.modelId)?.color || '#8b5cf6') + '11',
                                }}
                                title={conv.modelName}
                              >
                                {conv.modelName}
                              </span>
                            )}
                            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest shrink-0 mt-0.5">
                              {conv.updatedAt ? new Date(conv.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00'}
                            </span>
                          </div>
                        </div>

                        <div className="opacity-0 group-hover/item:opacity-100 transition-opacity translate-x-1 group-hover/item:translate-x-0 transition-all duration-500 shrink-0">
                          <ChevronRight className="w-4 h-4 text-primary" />
                        </div>
                      </button>
                    ))}

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-12 flex flex-col items-center gap-4 border border-dashed border-white/5 rounded-[2rem]">
            <div className="w-12 h-12 rounded-[1.5rem] bg-white/[0.02] flex items-center justify-center border border-white/5 text-gray-800">
              <History className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Üres</p>
              <p className="text-[9px] text-gray-700 font-bold uppercase tracking-tighter">
                {searchQuery ? 'Nincs találat' : 'Az új beszélgetések itt jelennek meg'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
