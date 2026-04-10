import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Download, Camera, Maximize2, RotateCcw, Loader2, Sparkles, Sliders, Grid3x3 } from 'lucide-react';
import ThreeViewer from '../../ai_components/meshy/viewer/ThreeViewer';
import { BgColorPicker } from '../../ai_components/trellis/BgColorPicker';

export default function TrellisWorkspace({ 
  modelUrl, 
  genStatus, 
  activeItem,
  onDownload,
  onCameraReset
}) {
  const [viewMode, setViewMode] = useState("clay");
  const [showGrid, setShowGrid] = useState(true);
  const [bgColor, setBgColor] = useState("grayish");
  
  const isPending = genStatus === "pending";

  return (
    <div className="relative h-full flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* Top Toolbar — Floating Station Header */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 h-14 rounded-2xl border border-white/5 bg-[#0a0a0f]/40 flex items-center justify-between px-6 backdrop-blur-3xl z-40 shadow-2xl min-w-[600px] transition-all duration-700 hover:bg-[#0a0a0f]/60 hover:border-white/10">
        <div className="flex items-center gap-4">
           <div className="flex bg-white/[0.02] rounded-xl p-1 border border-white/5">
              {['clay', 'textured', 'wireframe'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] italic transition-all ${
                    viewMode === mode ? 'bg-white text-black shadow-lg scale-105' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  {mode}
                </button>
              ))}
           </div>
           <div className="w-px h-5 bg-white/5 mx-2" />
           <button 
             onClick={() => setShowGrid(!showGrid)}
             className={`p-2 rounded-xl transition-all border ${showGrid ? 'bg-primary/10 border-primary/30 text-primary shadow-lg' : 'bg-white/5 border-white/5 text-zinc-700 hover:text-zinc-500'}`}
           >
              <Grid3x3 className="w-4 h-4" />
           </button>
           <div className="w-px h-5 bg-white/5 mx-2" />
           <BgColorPicker value={bgColor} onChange={setBgColor} />
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={onDownload}
             className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-zinc-500 font-black text-[9px] uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
           >
              EXPORT GLB <Download className="w-3.5 h-3.5" />
           </button>
           <button className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all">
              <Camera className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 relative overflow-hidden bg-[#0d0d12] pt-20 lg:pt-24">
        {/* Loading Overlay */}
        <AnimatePresence>
          {isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-[#0a0a0f]/90 backdrop-blur-xl flex flex-col items-center justify-center text-center p-10"
            >
               <div className="relative mb-8">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    className="w-24 h-24 rounded-full border border-white/10 border-t-white shadow-2xl" 
                  />
                  <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-white animate-pulse" />
               </div>
               <h3 className="text-xl font-black text-white italic tracking-[0.3em] uppercase mb-3">Voxel Construction</h3>
               <p className="text-zinc-600 max-w-sm font-bold text-[10px] uppercase tracking-widest leading-relaxed">Assembling high-fidelity mesh clusters via neural logic flow. Estimated processing: 30-45s.</p>
               
               <div className="mt-10 flex gap-1.5">
                  {[1,2,3,4].map(i => (
                    <motion.div 
                      key={i} 
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-white/20" 
                    />
                  ))}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!modelUrl && !isPending && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 pointer-events-none">
             <div className="w-24 h-24 rounded-[2.5rem] bg-white/[0.01] border border-white/5 flex items-center justify-center mb-10">
                <Box className="w-10 h-10 text-zinc-800" />
             </div>
             <h2 className="text-2xl font-black text-zinc-700 italic tracking-[0.4em] uppercase mb-4">Void Space Zero.</h2>
             <p className="text-zinc-800/40 max-w-sm font-black text-[9px] uppercase tracking-[0.5em] italic">Execute spatial directive to inhabit viewport</p>
          </div>
        )}

        {/* 3D Viewer */}
        {modelUrl && (
          <div className="absolute inset-0">
             <ThreeViewer 
               modelUrl={modelUrl}
               viewMode={viewMode}
               showGrid={showGrid}
               bgColor={bgColor}
               autoSpin={true}
               onReady={(s) => {}}
               color="#a78bfa"
             />
          </div>
        )}

        {/* HUD Elements */}
        {modelUrl && !isPending && (
          <div className="absolute bottom-10 right-10 z-20 flex flex-col gap-3">
             <div className="bg-[#0a0a0f]/60 backdrop-blur-2xl p-4 rounded-2xl border border-white/5 flex flex-col gap-4 shadow-2xl">
                <button onClick={onCameraReset} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all">
                   <RotateCcw className="w-4 h-4" />
                </button>
                <div className="h-px bg-white/5 mx-1" />
                <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all">
                   <Sliders className="w-4 h-4" />
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Model Info Banner */}
      {activeItem && !isPending && (
        <div className="h-10 bg-white/[0.02] border-t border-white/5 backdrop-blur-3xl px-6 flex items-center justify-between overflow-hidden relative">
           <p className="relative z-10 text-[8px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Active Cluster: {activeItem.name || 'Alpha Generation'}</p>
           <div className="flex items-center gap-6 relative z-10">
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest italic">Mesh Optimization: Stable</span>
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest italic">Signal: Ready</span>
           </div>
        </div>
      )}
    </div>
  );
}
