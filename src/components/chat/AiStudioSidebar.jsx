import React, { useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, X, ChevronDown, Zap, Sparkles, Home, ImageIcon, Pencil } from 'lucide-react';
import { MODEL_GROUPS, ALL_MODELS, getModel, findModelGroup } from '../../ai_components/models';
import bgChat from '../../assets/bg-chat.png';
import bgCode from '../../assets/bg-code.png';
import bgAudio from '../../assets/bg-audio.png';
import bgImage from '../../assets/bg-image.png';
import bg3d from '../../assets/bg-3d.png';
import neuralCoin from '../../assets/neural-coin.png';
import { MyUserContext } from '../../context/MyUserProvider';
import { useJobs } from '../../context/JobsContext';
import JobQueueWidget from './JobQueueWidget';

// Kép generáló modellek (nem szerkesztők)
const IMAGE_GEN_MODELS = ALL_MODELS.filter(m => m.panelType === 'image' && !m.needsInputImage);
// Kép szerkesztő modellek (needsInputImage: true)
const IMAGE_EDIT_MODELS = ALL_MODELS.filter(m => m.panelType === 'image' && m.needsInputImage);

const CATEGORY_BGS = {
  chat: bgChat,
  code: bgCode,
  audio: bgAudio,
  image: bgImage,
  threed: bg3d
};

function CoinIcon({ size = 26 }) {
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      {/* Dynamic Glow Background */}
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-[6px] animate-pulse" />

      {/* The Neural Coin Asset */}
      <img
        src={neuralCoin}
        alt="Credits"
        className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]"
      />
    </div>
  );
}

export default function AiStudioSidebar({
  selectedAI,
  openGroups,
  openCats,
  toggleGroup,
  toggleCat,
  handleSelectModel,
  setSidebarOpen,
  isMobile,
  onOpenJob
}) {
  const selectedModel = getModel(selectedAI);
  const { user } = useContext(MyUserContext);
  const { clearSeenCompletedJobs } = useJobs();
  const activeColor = selectedModel?.color || '#8b5cf6';
  const currentGroupId = findModelGroup(selectedAI) || 'chat';
  const currentBg = CATEGORY_BGS[currentGroupId] || bgChat;
  const handleJobOpen = (job) => {
    clearSeenCompletedJobs(job.panelType);
    if (onOpenJob) onOpenJob(job);
  };

  return (
    <div
      className="flex flex-col h-full relative z-[100] overflow-hidden bg-[#0a0a0f]/60 backdrop-blur-3xl"
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
        <div className="px-5 py-5 flex flex-col gap-4">

          {/* Top Row: AI Workspace Branding */}
          <div className="flex items-center justify-between z-20 relative">
            <div className="flex items-center gap-3.5 pt-1">
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-700 relative z-10"
                  style={{
                    background: `linear-gradient(135deg, ${activeColor}15, ${activeColor}05)`,
                    borderColor: `${activeColor}30`,
                    color: activeColor,
                    boxShadow: `0 8px 24px ${activeColor}10, inset 0 1px 0 rgba(255,255,255,0.1)`
                  }}
                >
                  <Wand2 className="w-5 h-5 flex-shrink-0" />
                </div>
                <div
                  className="absolute -inset-2 rounded-full opacity-20 blur-xl transition-all duration-700"
                  style={{ background: activeColor }}
                />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] italic mb-0.5" style={{ color: activeColor }}>
                  Workspace
                </p>
                <h2 className="text-white font-black text-[13px] uppercase tracking-widest leading-none flex items-center gap-2">
                  Intelligence
                  <Sparkles className="w-3 h-3 text-primary" style={{ fill: `${activeColor}30` }} />
                </h2>
              </div>
            </div>

            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex-shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center border border-white/5 bg-white/[0.02] text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Super Premium Separator */}
          <div className="relative flex items-center justify-center">
            <div className="w-full h-px bg-white/5" />
            <div className="absolute w-24 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent blur-[1px]" />
          </div>

          {/* Bottom Row: User & Platform Nav */}
          <div className="flex items-center justify-between gap-3 relative z-10">
            {/* Balance / Profile */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex-1 flex items-center justify-between px-3.5 py-2 rounded-[14px] bg-white/[0.03] border border-white/5 backdrop-blur-md relative overflow-hidden group/balance cursor-default"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/balance:opacity-100 transition-opacity duration-500" />
              <div className="flex items-center gap-2.5 relative z-10">
                <CoinIcon size={18} />
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-white italic tracking-tighter leading-none">
                    {(user?.credits ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">Available</span>
                </div>
              </div>
              <Link to="/pricing" className="relative z-10 p-1.5 rounded-lg bg-white/[0.04] text-zinc-500 hover:text-white hover:bg-primary/20 transition-all">
                <Zap className="w-3 h-3" />
              </Link>
            </motion.div>

            {/* Home Button (House Icon) */}
            <Link
              to="/"
              className="flex-shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center relative overflow-hidden group border border-white/5 hover:border-white/20 transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.02)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Home className="w-[18px] h-[18px] text-zinc-500 group-hover:text-white transition-colors relative z-10" />
              <div className="absolute bottom-0 inset-x-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
            </Link>
          </div>

        </div>
      </div>

      {/* ── Model List ── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-1 relative z-10 scrollbar-hide">
        {MODEL_GROUPS.map((group) => {
          // Skip Chat group — model switching is now handled by ModelBar at the top
          if (group.id === 'chat') return null;

          // Code group: always open, no accordion toggle (model switching is in ModelBar)
          const isCodeGroup = group.id === 'code';
          const isOpen = isCodeGroup || openGroups.has(group.id);
          const hasActive = group.categories.some(c => c.models.some(m => m.id === selectedAI));

          return (
            <div key={group.id}>
              {/* Group Header */}
              {!isCodeGroup ? (
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
              ) : (
                /* Code group: clickable header, navigates to code panel */
                <button
                  onClick={() => {
                    const firstCodeModel = group.categories[0]?.models[0];
                    if (firstCodeModel) handleSelectModel(firstCodeModel.id);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    hasActive
                      ? 'bg-white/[0.04] border-white/10'
                      : 'bg-transparent border-transparent hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all ${
                      hasActive ? 'bg-white/[0.06] scale-100' : 'bg-transparent opacity-40 scale-90'
                    }`}>
                      {group.emoji}
                    </div>
                    <span className={`text-[12px] font-black uppercase tracking-[0.15em] transition-colors ${
                      hasActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}>
                      {group.label}
                    </span>
                  </div>
                </button>
              )}

              {/* Expanded Content */}
              {isOpen && !isCodeGroup && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  {/* Kép group: csak 2 gomb */}
                  {group.id === 'image' ? (
                    <div className="pt-3 pb-1 space-y-1.5">
                      {[
                        {
                          label: 'Képgenerálás',
                          icon: <ImageIcon className="w-4 h-4" />,
                          models: IMAGE_GEN_MODELS,
                          getRestoredId: () => {
                            const specific = sessionStorage.getItem('ludusgen_last_model:image_gen');
                            if (specific && IMAGE_GEN_MODELS.some(m => m.id === specific)) return specific;
                            const generic = sessionStorage.getItem('ludusgen_last_model:image');
                            if (generic && IMAGE_GEN_MODELS.some(m => m.id === generic)) return generic;
                            return IMAGE_GEN_MODELS[0]?.id;
                          }
                        },
                        {
                          label: 'Képszerkesztés',
                          icon: <Pencil className="w-4 h-4" />,
                          models: IMAGE_EDIT_MODELS,
                          getRestoredId: () => {
                            const specific = sessionStorage.getItem('ludusgen_last_model:image_edit');
                            if (specific && IMAGE_EDIT_MODELS.some(m => m.id === specific)) return specific;
                            const generic = sessionStorage.getItem('ludusgen_last_model:image');
                            if (generic && IMAGE_EDIT_MODELS.some(m => m.id === generic)) return generic;
                            return IMAGE_EDIT_MODELS[0]?.id;
                          }
                        },
                      ].map((item) => {
                        const isActive = item.models.some(m => m.id === selectedAI);
                        const activeModel = isActive ? getModel(selectedAI) : null;
                        const color = activeModel?.color || '#f59e0b';
                        return (
                          <button
                            key={item.label}
                            onClick={() => {
                              const targetId = item.getRestoredId();
                              if (targetId) handleSelectModel(targetId);
                            }}
                            className={`w-full relative rounded-2xl border overflow-hidden transition-all duration-300 group/item ${isActive
                                ? 'border-white/10'
                                : 'border-transparent hover:border-white/5 hover:bg-white/[0.02]'
                              }`}
                            style={isActive ? { background: 'rgba(255,255,255,0.06)' } : {}}
                          >
                            {isActive && (
                              <div
                                className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
                              />
                            )}
                            <div className="flex items-center gap-3 pl-5 pr-4 py-3">
                              <span
                                className="flex-shrink-0"
                                style={{ color: isActive ? color : '#52525b' }}
                              >
                                {item.icon}
                              </span>
                              <span
                                className={`text-[12px] font-black uppercase tracking-tight transition-colors ${isActive ? 'text-white italic' : 'text-zinc-500 group-hover/item:text-zinc-300'
                                  }`}
                              >
                                {item.label}
                              </span>
                              <span className="ml-auto text-[8px] font-bold text-zinc-700 uppercase tracking-widest">
                                {item.models.length} modell
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pt-3 pb-1 space-y-4">
                      {group.categories.map((cat) => (
                        <div key={cat.id} className="space-y-1.5">
                          {cat.label && (
                            <div className="flex items-center gap-3 px-1">
                              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600">
                                {cat.label}
                              </span>
                              <div className="flex-1 h-px bg-white/5" />
                            </div>
                          )}
                          {cat.models.map((model) => {
                            const isActive = selectedAI === model.id;
                            if (isActive) {
                              return (
                                <button
                                  key={model.id}
                                  onClick={() => handleSelectModel(model.id)}
                                  className="w-full relative rounded-2xl border border-white/10 overflow-hidden transition-all duration-300 group/item"
                                  style={{ background: 'rgba(255,255,255,0.06)' }}
                                >
                                  <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                                    style={{ backgroundColor: model.color, boxShadow: `0 0 8px ${model.color}60` }}
                                  />
                                  <div className="absolute left-[14px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                                    style={{ backgroundColor: model.color, boxShadow: `0 0 10px ${model.color}` }}
                                  />
                                  <div className="flex items-center justify-between pl-8 pr-4 py-3">
                                    <span className="text-[12px] font-black text-white italic uppercase tracking-tight">{model.name}</span>
                                    {model.badge && (
                                      <span className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-white/[0.08] text-zinc-300 border border-white/10">{model.badge}</span>
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
                                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-tight group-hover/item:text-zinc-300 transition-colors">{model.name}</span>
                                </div>
                                {model.badge && (
                                  <span className="px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest bg-white/[0.03] text-zinc-700 border border-white/5">{model.badge}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Separator between groups */}
              <div className="border-b border-white/5 my-2" />
            </div>
          );
        })}
      </div>

      <JobQueueWidget onOpenJob={handleJobOpen} />
    </div>
  );
}
