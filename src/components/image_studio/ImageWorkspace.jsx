import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ZoomIn, RefreshCw, AlertCircle, ImageIcon, Share2, Heart, ExternalLink, Sparkles, Zap, Command, Activity } from 'lucide-react';

export default function ImageWorkspace({ isGenerating, images, error, selectedModel }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const downloadImage = (url) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `neural_forge_${Date.now()}.png`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-full w-full pt-8 p-8 md:p-12 flex flex-col relative overflow-y-auto scrollbar-hide bg-transparent">
      
      {/* Ambient Gradient Glow — Enhanced for cinematic depth */}
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] blur-[180px] opacity-[0.06] pointer-events-none z-0 transition-colors duration-1000"
        style={{ backgroundColor: selectedModel.color || '#8b5cf6' }}
      />

      <AnimatePresence mode="wait">
        
        {/* State: Error */}
        {error && (
          <motion.div 
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

        {/* State: Generating / Initial */}
        {!error && images.length === 0 && (
          <motion.div 
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
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                    className="w-32 h-32 rounded-full border border-white/5 border-t-white shadow-[0_0_50px_rgba(255,255,255,0.05)]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
                <div className="space-y-5">
                   <h3 className="text-2xl font-black text-white italic tracking-[0.4em] uppercase">Forging Asset<span className="animate-pulse">...</span></h3>
                   <div className="flex items-center justify-center gap-3">
                      <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest bg-white/[0.02] px-3 py-1.5 rounded-md border border-white/5">Neural Analysis</div>
                      <div className="w-1 h-1 rounded-full bg-zinc-800" />
                      <div className="text-[8px] font-black text-zinc-300 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-md border border-white/10">Pixel Synthesis</div>
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

        {/* State: Results */}
        {images.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-12 relative z-10 p-4 pb-40"
          >
            {images.map((img, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                onHoverStart={() => setHoveredIdx(idx)}
                onHoverEnd={() => setHoveredIdx(null)}
                className="relative group rounded-[2.5rem] overflow-hidden border border-white/5 aspect-square bg-[#0d0d12] shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:border-white/15"
              >
                <img src={img} alt="Generated" className="w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-105" />
                
                {/* Overlay Controls */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredIdx === idx ? 1 : 0 }}
                  className="absolute inset-0 bg-gradient-to-t from-[#0a0a14]/90 via-transparent to-transparent flex flex-col justify-end p-8 transition-all duration-500 backdrop-blur-[2px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                       <button 
                        onClick={() => downloadImage(img)}
                        className="w-12 h-12 rounded-[1.2rem] bg-white text-black flex items-center justify-center hover:scale-110 transition-all active:scale-95 shadow-xl"
                       >
                         <Download className="w-5 h-5" />
                       </button>
                       <button className="w-12 h-12 rounded-[1.2rem] bg-zinc-950/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-zinc-800 transition-all border border-white/10">
                         <ZoomIn className="w-5 h-5" />
                       </button>
                    </div>
                    <div className="flex gap-3">
                       <button className="w-12 h-12 rounded-[1.2rem] bg-zinc-950/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-zinc-800 transition-all border border-white/10">
                         <Share2 className="w-5 h-5" />
                       </button>
                    </div>
                  </div>
                </motion.div>

                {/* Info Badge */}
                <div className="absolute top-6 left-6 px-3 py-1.5 bg-zinc-950/40 backdrop-blur-md border border-white/5 rounded-lg text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em] group-hover:text-white transition-colors flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                  Forge Output #{idx + 1}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workspace Footer Actions */}
      {images.length > 0 && !isGenerating && (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-40 px-6 py-3 rounded-[2rem] bg-white/[0.02] backdrop-blur-3xl border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
           <button className="px-6 py-3 rounded-xl bg-white/5 border border-white/5 text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white hover:bg-white/10 transition-all flex items-center gap-3">
             Bulk Export <Download className="w-4 h-4" />
           </button>
           <div className="w-px h-5 bg-white/5 mx-2" />
           <button className="px-6 py-3 rounded-xl bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center gap-3">
             Redefine <RefreshCw className="w-4 h-4" />
           </button>
        </motion.div>
      )}
    </div>
  );
}
