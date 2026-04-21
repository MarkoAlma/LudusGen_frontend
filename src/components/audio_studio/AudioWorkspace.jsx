import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Download, Mic, Music, Layout, 
  Sparkles, History, Activity, Share2, Trash2, X
} from 'lucide-react';

const MiniWaveform = ({ color, isPlaying }) => (
  <div className="flex items-center justify-center gap-1.5 h-32 px-16 relative">
    {Array.from({ length: 40 }).map((_, i) => (
      <motion.div
        key={i}
        animate={{
          height: isPlaying ? [10, Math.random() * 80 + 20, 10] : 8,
          opacity: isPlaying ? [0.6, 1, 0.6] : 0.1
        }}
        transition={{
          duration: 0.4 + Math.random() * 0.6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: i * 0.02
        }}
        className="w-[3px] rounded-full shadow-lg"
        style={{
          backgroundColor: isPlaying ? color : 'rgba(255,255,255,0.05)',
        }}
      />
    ))}
  </div>
);

export default function AudioWorkspace({ 
  view, 
  isGenerating, 
  audioUrl, 
  isPlaying, 
  togglePlay, 
  color, 
  history,
  onHistorySelect
}) {
  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `neural_audio_${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full w-full relative z-10 flex flex-col items-center justify-center p-8 overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'history' ? (
          <motion.div 
            key="history-grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-5xl h-full flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <History className="w-5 h-5 text-white/40" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white italic uppercase tracking-[0.2em]">Archívum</h2>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Neurális generálások előzményei</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {history.map((item, idx) => (
                  <button 
                    key={item.id || idx}
                    onClick={() => onHistorySelect(item)}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all text-left flex items-start gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                      {item.type === 'music' ? <Music className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-white truncate mb-1">
                        {item.text || item.prompt || "Névtelen töredék"}
                      </div>
                      <div className="flex items-center gap-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest italic">
                        <span>{item.type || 'audio'}</span>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <span>{new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="forge-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center justify-center"
          >
            {isGenerating ? (
              <div className="flex flex-col items-center gap-8">
                <MiniWaveform color={color} isPlaying={true} />
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10">
                    <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-[10px] font-black text-white italic uppercase tracking-[0.2em]">Neurális feldolgozás</span>
                  </div>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Hangfrekvenciák szintézise...</p>
                </div>
              </div>
            ) : audioUrl ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-3xl aspect-[16/10] flex flex-col rounded-[2.5rem] bg-white/[0.01] backdrop-blur-2xl border border-white/5 shadow-2xl relative overflow-hidden"
              >
                {/* Visual Flair */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                <div className="flex-1 flex flex-col items-center justify-center p-12">
                  <div className="mb-12 flex flex-col items-center text-center gap-2">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] italic">Hang sikeresen létrehozva</div>
                    <h3 className="text-3xl font-black text-white uppercase tracking-wider line-clamp-1 italic">
                      Neurális Mester v1
                    </h3>
                  </div>

                  <div className="w-full relative group">
                    <div className="absolute inset-0 bg-white/5 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity" />
                    <MiniWaveform color={color} isPlaying={isPlaying} />
                  </div>

                  <div className="mt-12 flex items-center gap-6">
                    <button 
                      onClick={togglePlay} 
                      className="w-20 h-20 rounded-[1.8rem] flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-2xl shadow-primary/25"
                      style={{ backgroundColor: color }}
                    >
                      {isPlaying ? <Pause className="w-8 h-8 text-white fill-current" /> : <Play className="w-8 h-8 text-white fill-current ml-1" />}
                    </button>

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={handleDownload}
                          className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                          <Share2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="px-10 py-5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Stabil jel</span>
                  </div>
                  <div className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
                    Veszteségmentes tömörítés 48kHz
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center gap-6 opacity-20">
                <div className="w-24 h-24 rounded-[2rem] border-2 border-dashed border-white/10 flex items-center justify-center">
                  <Mic className="w-10 h-10" />
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-black uppercase tracking-[0.4em] italic mb-1">Bemenetre vár</h4>
                  <p className="text-[9px] font-bold uppercase tracking-widest">Állítsd be a paramétereket a kezdéshez</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
