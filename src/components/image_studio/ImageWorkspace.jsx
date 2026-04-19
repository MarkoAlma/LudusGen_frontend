import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ZoomIn, RefreshCw, AlertCircle, ImageIcon, Share2, X, ChevronLeft, ChevronRight, Sparkles, Zap } from 'lucide-react';

// ── Lightbox Modal ──────────────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrent((c) => (c + 1) % images.length);
      if (e.key === 'ArrowLeft') setCurrent((c) => (c - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [images.length, onClose]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      {/* Image */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-[92vw] max-h-[92vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[current]}
          alt="Full size"
          className="max-w-[92vw] max-h-[92vh] object-contain rounded-2xl shadow-2xl"
        />

        {/* Gomb sáv alul */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10">
          {images.length > 1 && (
            <button
              onClick={() => setCurrent((c) => (c - 1 + images.length) % images.length)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => {
              const a = document.createElement('a');
              a.href = images[current];
              a.download = `ludusgen_${Date.now()}.png`;
              a.click();
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
          {images.length > 1 && (
            <>
              <span className="text-white/40 text-[11px] font-black tracking-widest">
                {current + 1} / {images.length}
              </span>
              <button
                onClick={() => setCurrent((c) => (c + 1) % images.length)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Bezárás */}
      <button
        className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>
    </motion.div>,
    document.body
  );
}

// ── Egy képkártya ───────────────────────────────────────────────────────────────
function ImageCard({ img, idx, onZoom, onDownload }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group rounded-[2rem] overflow-hidden border border-white/5 bg-[#0d0d12] shadow-2xl transition-all duration-500 hover:border-white/15 hover:shadow-[0_0_60px_rgba(0,0,0,0.6)]"
    >
      {/* Kép – valódi aspect ratio, NEM blur hover-nél */}
      <img
        src={img}
        alt={`Generated ${idx + 1}`}
        className="w-full h-auto object-contain block transition-transform duration-[3000ms] group-hover:scale-[1.025]"
        draggable={false}
      />

      {/* Overlay – csak alulról terjed, a kép NEM mosódik el */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-t from-[#060410]/80 via-transparent to-transparent flex flex-col justify-end p-6 pointer-events-none"
          >
            {/* Gombsor — pointer events bekapcsolva */}
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex gap-2">
                <button
                  onClick={() => onZoom(idx)}
                  className="w-11 h-11 rounded-[1.1rem] bg-white/10 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-all hover:scale-105 active:scale-95"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDownload(img)}
                  className="w-11 h-11 rounded-[1.1rem] bg-white text-black flex items-center justify-center hover:scale-105 transition-all active:scale-95 shadow-xl"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
              <button className="w-11 h-11 rounded-[1.1rem] bg-white/10 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-all hover:scale-105 active:scale-95">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge jobb felül */}
      <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/50 backdrop-blur-md border border-white/8 rounded-lg text-[8px] font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-1.5">
        <div className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
        Output #{idx + 1}
      </div>
    </motion.div>
  );
}

// ── Fő komponens ────────────────────────────────────────────────────────────────
// ── Fő komponens ────────────────────────────────────────────────────────────────
export default function ImageWorkspace({ isGenerating, images, onClear, error, selectedModel, genProgress = 0, genStatus = '', genElapsed = 0 }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const downloadImage = (url) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `ludusgen_${Date.now()}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Elrendezés: 1 kép → teljes szélesség, 2-4 kép → 2 oszlop
  const gridClass =
    images.length === 1
      ? 'flex justify-center'
      : 'grid grid-cols-1 xl:grid-cols-2 gap-8';

  return (
    <div className="h-full w-full pt-8 px-8 md:px-12 pb-40 flex flex-col relative overflow-y-auto scrollbar-hide bg-transparent">

      {/* Ambient glow */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] blur-[180px] opacity-[0.06] pointer-events-none z-0 transition-colors duration-1000"
        style={{ backgroundColor: selectedModel?.color || '#8b5cf6' }}
      />

      <AnimatePresence mode="wait">

        {/* ── Hibaállapot ── */}
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center gap-6 relative z-10"
          >
            <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/5 border border-red-500/20 flex items-center justify-center text-red-500 shadow-2xl">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Protocol Violation</h3>
              <p className="text-zinc-600 max-w-sm font-bold text-[11px] uppercase tracking-widest leading-relaxed">{error}</p>
            </div>
          </motion.div>
        )}

        {/* ── Generálás / Üres állapot ── */}
        {!error && images.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center relative z-10"
          >
            {isGenerating ? (
              <div className="flex flex-col items-center gap-10">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                    className="w-32 h-32 rounded-full border border-white/5 border-t-white/60 shadow-[0_0_50px_rgba(255,255,255,0.05)]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
                <div className="space-y-5">
                  <h3 className="text-2xl font-black text-white italic tracking-[0.4em] uppercase">
                    Forging Asset<span className="animate-pulse">...</span>
                  </h3>
                  {genStatus && (
                    <div className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md border ${
                      genStatus === 'PROCESSING'
                        ? 'text-white bg-white/10 border-white/20'
                        : 'text-zinc-400 bg-white/[0.02] border-white/5'
                    }`}>
                      {genStatus}
                    </div>
                  )}
                  <div className="w-64 flex flex-col items-center gap-2">
                    <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: selectedModel?.color || '#8b5cf6' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(genProgress, 6)}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                      {Math.max(genProgress, 6)}%{genElapsed > 0 ? ` · ${genElapsed}s` : ''}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-8 group opacity-100">
                <div className="w-24 h-24 rounded-[2.5rem] bg-white/[0.01] border border-white/5 flex items-center justify-center group-hover:scale-105 transition-all duration-700">
                  <div className="relative">
                    <ImageIcon className="w-8 h-8 text-zinc-800" />
                    <Sparkles className="absolute -top-3 -right-3 w-4 h-4 text-zinc-800" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-zinc-800 italic uppercase tracking-[0.5em]">System Standby</h3>
                  <p className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest">Execute prompt to initialize engine</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Eredmény képek ── */}
        {images.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`relative z-10 mt-4 ${gridClass}`}
          >
            {images.map((img, idx) => (
              <ImageCard
                key={idx}
                img={img}
                idx={idx}
                onZoom={setLightboxIdx}
                onDownload={downloadImage}
              />
            ))}
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── Footer akciók ── */}
      {images.length > 0 && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-40 px-6 py-3 rounded-[2rem] bg-white/[0.02] backdrop-blur-3xl border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          <button
            onClick={() => images.forEach(downloadImage)}
            className="px-6 py-3 rounded-xl bg-white/5 border border-white/5 text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
          >
            Bulk Export <Download className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-white/5 mx-2" />
          <button 
            onClick={onClear}
            className="px-6 py-3 rounded-xl bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center gap-3"
          >
            Close Asset <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <Lightbox
            images={images}
            startIndex={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
