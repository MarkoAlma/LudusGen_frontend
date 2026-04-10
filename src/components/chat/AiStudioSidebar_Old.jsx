import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, X, ChevronDown, Zap, Sparkles } from 'lucide-react';
import { MODEL_GROUPS, getModel } from '../../ai_components/models';

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

  return (
    <div
      className="flex flex-col h-full relative z-[100] overflow-hidden border-r border-white/5"
      style={{
        background: 'rgba(10,10,25,0.4)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* ── Ambient Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-20 -left-20 w-64 h-64 opacity-[0.07] blur-[100px] transition-all duration-1000"
          style={{ background: `radial-gradient(circle, ${activeColor}, transparent)` }}
        />
        <div className="absolute top-1/2 -right-32 w-48 h-48 bg-purple-900/10 blur-[80px] rounded-full" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0a0a19] to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* ── Header ── */}
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
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-2 relative z-10 scrollbar-hide">
        {MODEL_GROUPS.map((group, gi) => {
          const isOpen = openGroups.has(group.id);
          const hasActive = group.categories.some(c => c.models.some(m => m.id === selectedAI));

          return (
            <div key={group.id} className={`mb-2 ${gi < MODEL_GROUPS.length - 1 ? 'border-b border-white/5 pb-3' : ''}`}>
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 relative group overflow-hidden ${
                  isOpen || hasActive
                    ? 'bg-white/[0.04] border border-white/10'
                    : 'hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                {/* Active Group Indicator */}
                {hasActive && !isOpen && (
                  <div
                    className="absolute left-0 top-1 bottom-1 w-1 rounded-full"
                    style={{
                      backgroundColor: group.color,
                      boxShadow: `0 0 8px ${group.color}40`
                    }}
                  />
                )}

                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all ${
                    isOpen || hasActive ? 'bg-white/[0.06] scale-100' : 'bg-transparent opacity-30 scale-90'
                  }`}>
                    {group.emoji}
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-[0.12em] transition-colors ${
                    isOpen || hasActive ? 'text-zinc-200' : 'text-zinc-600 group-hover:text-zinc-400'
                  }`}>
                    {group.label}
                  </span>
                </div>

                <div className={`transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}>
                  <ChevronDown className={`w-3.5 h-3.5 ${isOpen || hasActive ? 'text-zinc-500' : 'text-zinc-800'}`} />
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 mt-2 border-l border-white/5 space-y-3 py-1 ml-6">
                      {group.categories.map((cat) => (
                        <div key={cat.id} className="space-y-1">
                          {cat.label && (
                            <div className="px-3 py-2 font-black text-[7px] text-zinc-600 uppercase tracking-[0.35em] flex items-center gap-2">
                              {cat.label}
                              <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.06] to-transparent" />
                            </div>
                          )}
                          <div className="space-y-1">
                            {cat.models.map((model) => {
                              const isActive = selectedAI === model.id;
                              return (
                                <button
                                  key={model.id}
                                  onClick={() => handleSelectModel(model.id)}
                                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all duration-300 relative group/item overflow-hidden ${
                                    isActive
                                      ? 'text-white bg-white/[0.04] border border-white/10'
                                      : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent'
                                  }`}
                                >
                                  {/* Active glow */}
                                  {isActive && (
                                    <>
                                      <div
                                        className="absolute -left-4 -top-4 w-12 h-12 blur-xl opacity-15 rounded-full"
                                        style={{ backgroundColor: model.color }}
                                      />
                                      <div
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
                                        style={{
                                          backgroundColor: model.color,
                                          boxShadow: `0 0 8px ${model.color}50`
                                        }}
                                      />
                                    </>
                                  )}

                                  <div className="flex items-center gap-3 relative z-10">
                                    <div className="relative">
                                      <div
                                        className={`w-1.5 h-1.5 rounded-full transition-all duration-700 ${
                                          isActive ? 'scale-125' : 'bg-zinc-800'
                                        }`}
                                        style={isActive ? {
                                          backgroundColor: model.color,
                                          boxShadow: `0 0 8px ${model.color}`
                                        } : {}}
                                      />
                                    </div>
                                    <span className={`text-[11px] font-bold uppercase tracking-tight transition-all duration-300 ${
                                      isActive ? 'text-white italic' : 'group-hover/item:translate-x-0.5'
                                    }`}>
                                      {model.name}
                                    </span>
                                  </div>

                                  {model.badge && (
                                    <div
                                      className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest relative z-10 transition-all border ${
                                        isActive
                                          ? 'bg-white/[0.08] text-zinc-300 border-white/10'
                                          : 'bg-zinc-900/50 text-zinc-700 border-white/5'
                                      }`}
                                    >
                                      {model.badge}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
