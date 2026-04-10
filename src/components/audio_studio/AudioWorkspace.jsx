import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Download, Volume2, Music, Mic, AlertCircle, Headphones, Sparkles, Zap, Activity, Share2 } from 'lucide-react';

const MiniWaveform = ({ color, isPlaying }) => (
  <div className="flex items-center gap-1.5 h-48 px-16 relative">
    {Array.from({ length: 50 }).map((_, i) => (
      <motion.div 
        key={i} 
        animate={{ 
          height: isPlaying ? [30, Math.random() * 120 + 30, 30] : 10,
          opacity: isPlaying ? [0.6, 1, 0.6] : 0.1
        }}
        transition={{ 
          duration: 0.4 + Math.random() * 0.6, 
          repeat: Infinity,
          ease: "easeInOut",
          delay: i * 0.02
        }}
        className="w-1.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.05)]"
        style={{
          backgroundColor: isPlaying ? color : 'rgba(255,255,255,0.05)',
        }}
      />
    ))}
  </div>
);

export default function AudioWorkspace({ 
  audioUrl, isGenerating, error, selectedModel, 
  isPlaying, setIsPlaying, audioRef 
}) {
  const color = selectedModel.color || "#10b981";

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) { 
      audioRef.current.pause(); 
      setIsPlaying(false); 
    } else { 
      audioRef.current.play();  
      setIsPlaying(true);  
    }
  };

  return (
    <div className="h-full w-full pt-20 lg:pt-24 flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 relative overflow-hidden bg-transparent">
      
      {/* Ambient Gradient Glow — Enhanced for cinematic depth */}
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] blur-[180px] opacity-[0.06] pointer-events-none z-0 transition-colors duration-1000"
        style={{ backgroundColor: color }}
      />

      <AnimatePresence mode="wait">
        {/* State: Error */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 text-center z-10"
          >
            <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/5 border border-red-500/20 flex items-center justify-center text-red-500 shadow-2xl">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
               <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Frequency Violation</h3>
               <p className="text-zinc-600 max-w-sm font-bold text-[11px] uppercase tracking-widest leading-relaxed">{error}</p>
            </div>
          </motion.div>
        )}

        {/* State: Generating */}
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-12 z-10"
          >
            <div className="relative">
              <div className="w-48 h-48 rounded-[2rem] bg-white/[0.01] border border-white/5 flex items-center justify-center relative z-10 shadow-2xl backdrop-blur-3xl overflow-hidden">
                 <MiniWaveform color={color} isPlaying={true} />
              </div>
            </div>
            <div className="text-center space-y-5">
               <h3 className="text-2xl font-black text-white italic tracking-[0.4em] uppercase">Synthesizing Alpha<span className="animate-pulse">...</span></h3>
               <div className="flex items-center justify-center gap-3">
                  <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest bg-white/[0.02] px-3 py-1.5 rounded-md border border-white/5">Harmonic Analysis</div>
                  <div className="w-1 h-1 rounded-full bg-zinc-800" />
                  <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-3 py-1.5 rounded-md border border-emerald-500/10">Neural Mastering</div>
               </div>
            </div>
          </motion.div>
        )}

        {/* State: Results / Player */}
        {!isGenerating && !error && audioUrl && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-4xl p-12 md:p-20 lg:p-24 rounded-[3.5rem] border border-white/5 flex flex-col items-center gap-12 shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative z-10 overflow-hidden bg-white/[0.01]"
          >
            {/* Ambient Animated Pulse Ring */}
            <div className={`absolute inset-0 border border-emerald-500/10 rounded-[3.5rem] pointer-events-none transition-all duration-1000 ${isPlaying ? 'scale-[0.99] opacity-100' : 'scale-100 opacity-20'}`} />

            {/* Visualizer Area */}
            <div className="w-full h-56 bg-zinc-950/40 rounded-[2rem] border border-white/5 flex items-center justify-center overflow-hidden relative shadow-inner">
               <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none" />
               <MiniWaveform color={color} isPlaying={isPlaying} />
               
               <div className="absolute top-6 left-8 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-white/10'}`} />
                  <span className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.3em] italic">
                    {isPlaying ? 'Signal Active' : 'Standby'}
                  </span>
               </div>

               <div className="absolute bottom-6 right-8">
                  <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Master PCM v4.2</span>
               </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center gap-10">
               <button 
                 onClick={togglePlay}
                 className="w-24 h-24 rounded-3xl bg-white text-black flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-2xl group"
               >
                 {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1.5 group-hover:scale-110 transition-transform" />}
               </button>
               
               <div className="flex flex-col gap-3">
                  <a 
                    href={audioUrl} download 
                    className="px-8 py-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center gap-3 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                  >
                    Export Digital Master <Download className="w-4 h-4" />
                  </a>
                  <button className="px-8 py-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-500 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500/10 transition-all active:scale-95 flex items-center justify-center gap-3">
                    Neural Hub <Share2 className="w-4 h-4" />
                  </button>
               </div>
            </div>

            <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />

            <div className="text-center group">
              <h4 className="text-lg font-black text-zinc-100 italic tracking-tighter mb-1.5 group-hover:text-emerald-400 transition-colors">Master Signal Propagated</h4>
              <p className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.4em] italic leading-none">Acoustic Logic Node v9.2.1</p>
            </div>
          </motion.div>
        )}

        {/* State: Initial Empty */}
        {!isGenerating && !error && !audioUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-8 group z-10"
          >
            <div className="w-24 h-24 rounded-[2.5rem] bg-white/[0.01] border border-white/5 flex items-center justify-center group-hover:scale-105 transition-all duration-700 relative shadow-2xl">
              <div className="relative z-10">
                {selectedModel.audioType === 'tts' ? <Mic className="w-8 h-8 text-zinc-800" /> : <Music className="w-8 h-8 text-zinc-800" />}
              </div>
            </div>
            <div className="text-center space-y-3">
               <h3 className="text-sm font-black text-zinc-800 italic uppercase tracking-[0.5em]">Acoustic Foundry</h3>
               <p className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest">Execute prompt to initialize synthesis</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
