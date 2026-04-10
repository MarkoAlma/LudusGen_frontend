import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, X, ChevronDown, Zap, Sparkles } from 'lucide-react';
import { MODEL_GROUPS, getModel, findModelGroup } from '../../ai_components/models';
import bgChat from '../../assets/bg-chat.png';
import bgCode from '../../assets/bg-code.png';
import bgAudio from '../../assets/bg-audio.png';
import bgImage from '../../assets/bg-image.png';
import bg3d from '../../assets/bg-3d.png';

const CATEGORY_BGS = {
  chat: bgChat,
  code: bgCode,
  audio: bgAudio,
  image: bgImage,
  threed: bg3d
};

export default function AiStudioSidebar({
  selectedAI,
  openGroups,
  openCats,
  toggleGroup,
  toggleCat,
  handleSelectModel,
  setSidebarOpen,
  isMobile
}) {
  const selectedModel = getModel(selectedAI);
  const activeColor = selectedModel?.color || '#8b5cf6';
  const currentGroupId = findModelGroup(selectedAI) || 'chat';
  const currentBg = CATEGORY_BGS[currentGroupId] || bgChat;

  return (
    <div
      className="flex flex-col h-full relative z-[100] overflow-hidden border-r border-white/5"
      style={{
        background: 'rgba(0, 0, 2, 0.98)', /* Szinte teljesen fekete */
        backdropFilter: 'blur(40px)',
      }}
    >
      {/* ── Ambient Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Dynamic Category Background */}
        <AnimatePresence mode="popLayout">
          <motion.img
            key={currentBg}
            src={currentBg}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 0.1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover mix-blend-soft-light"
            alt=""
          />
        </AnimatePresence>

        {/* Color Tint Overlay */}
        <motion.div
          className="absolute inset-0 transition-colors duration-1000"
          animate={{ backgroundColor: activeColor }}
          style={{
            mixBlendMode: 'soft-light',
            opacity: 0.04
          }}
        />

        {/* Accent Gradients */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 opacity-[0.015] blur-[120px] transition-all duration-1000"
          style={{ background: `radial-gradient(circle, ${activeColor}, transparent)` }}
        />
        <div className="absolute top-1/2 -right-40 w-64 h-64 bg-purple-900/03 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#000000] to-transparent opacity-80" />
      </div>

      {/* ── Header ─ */}
      <div className="relative z-30 border-b border-white/5">
        <div className="px-6 h-20 lg:h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-700"
                style={{
                  background: `linear-gradient(135deg, ${activeColor}15, ${activeColor}05)`,
                  borderColor: `${activeColor}25`,
                  color: activeColor,
                  boxShadow: `0 0 20px ${activeColor}15, inset 0 1px 0 rgba(255,255,255,0.05)`
                }}
              >
                <Wand2 className="w-5 h-5" />
              </div>
              <div
                className="absolute -inset-1 rounded-2xl opacity-40 blur-md transition-all duration-700"
                style={{ background: `radial-gradient(circle, ${activeColor}20, transparent)` }}
              />
            </div>
            <div>
              <h2 className="text-white font-black text-[10px] uppercase tracking-[0.35em] italic leading-none flex items-center gap-2">
                Intelligence
                <Sparkles className="w-3 h-3 text-primary/40" />
              </h2>
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1.5">Neural Hub</p>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="p-2 text-zinc-600 hover:text-white transition-colors rounded-xl hover:bg-white/5">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Model List ── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-1 relative z-10 scrollbar-hide">
        {MODEL_GROUPS.map((group) => {
          const isOpen = openGroups.has(group.id);
          const hasActive = group.categories.some(c => c.models.some(m => m.id === selectedAI));

          return (
            <div key={group.id}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group ${isOpen
                    ? 'bg-white/[0.04] border border-white/10'
                    : 'hover:bg-white/[0.02] border border-transparent'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all ${isOpen ? 'bg-white/[0.06] scale-100' : 'bg-transparent opacity-40 scale-90'
                    }`}>
                    {group.emoji}
                  </div>
                  <span className={`text-[12px] font-black uppercase tracking-[0.15em] transition-colors ${isOpen ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}>
                    {group.label}
                  </span>
                </div>
                <div className={`transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}>
                  <ChevronDown className={`w-4 h-4 ${isOpen ? 'text-zinc-400' : 'text-zinc-700'}`} />
                </div>
              </button>

              {/* Expanded Content */}
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 pb-1 space-y-4">
                    {group.categories.map((cat) => (
                      <div key={cat.id} className="space-y-1.5">
                        {/* Provider Label */}
                        {cat.label && (
                          <div className="flex items-center gap-3 px-1">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600">
                              {cat.label}
                            </span>
                            <div className="flex-1 h-px bg-white/5" />
                          </div>
                        )}

                        {/* Model List */}
                        {cat.models.map((model) => {
                          const isActive = selectedAI === model.id;

                          if (isActive) {
                            return (
                              <button
                                key={model.id}
                                onClick={() => handleSelectModel(model.id)}
                                className="w-full relative rounded-2xl border border-white/10 overflow-hidden transition-all duration-300 group/item"
                                style={{
                                  background: 'rgba(255,255,255,0.06)',
                                }}
                              >
                                {/* Left accent bar */}
                                <div
                                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                                  style={{
                                    backgroundColor: model.color,
                                    boxShadow: `0 0 8px ${model.color}60`
                                  }}
                                />
                                {/* Active dot */}
                                <div
                                  className="absolute left-[14px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor: model.color,
                                    boxShadow: `0 0 10px ${model.color}`
                                  }}
                                />

                                <div className="flex items-center justify-between pl-8 pr-4 py-3">
                                  <span className="text-[12px] font-black text-white italic uppercase tracking-tight">
                                    {model.name}
                                  </span>
                                  {model.badge && (
                                    <span className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-white/[0.08] text-zinc-300 border border-white/10">
                                      {model.badge}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          }

                          return (
                            <button
                              key={model.id}
                              onClick={() => handleSelectModel(model.id)}
                              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 group/item"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-tight group-hover/item:text-zinc-300 transition-colors">
                                  {model.name}
                                </span>
                              </div>
                              {model.badge && (
                                <span className="px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest bg-white/[0.03] text-zinc-700 border border-white/5">
                                  {model.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Separator between groups */}
              <div className="border-b border-white/5 my-2" />
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="px-5 py-6 border-t border-white/5 relative z-20">
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-[40px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-700" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.4)' }} />
              <span className="text-[9px] font-black text-zinc-500 italic uppercase tracking-[0.3em]">PRO MASTER</span>
            </div>
            <p className="text-[9px] text-zinc-600 font-bold uppercase leading-relaxed tracking-widest">
              High-Fidelity Node
            </p>
            <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">
              Authorized Connect
            </p>
          </div>
          <div className="absolute -bottom-1 -right-1 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700">
            <Zap className="w-10 h-10 text-white" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
