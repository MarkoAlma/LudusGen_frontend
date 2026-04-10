import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Music, Volume2, Globe, Sliders, Zap, Sparkles, AlertCircle, Cpu, Activity, Headphones } from 'lucide-react';

const TTS_VOICES = [
  { id: "alloy",   label: "Alloy",   desc: "Neutral / Balanced", icon: "A" },
  { id: "echo",    label: "Echo",    desc: "Melancholic / Deep", icon: "E" },
  { id: "fable",   label: "Fable",   desc: "Expressive / British", icon: "F" },
  { id: "onyx",    label: "Onyx",    desc: "Authoritative / Deep", icon: "O" },
  { id: "nova",    label: "Nova",    desc: "Energetic / Friendly", icon: "N" },
  { id: "shimmer", label: "Shimmer", desc: "Soft / Pleasant", icon: "S" },
];

export default function AudioControls({
  selectedModel, isTTS,
  text, setText,
  selectedVoice, setSelectedVoice,
  speed, setSpeed,
  audioFormat, setAudioFormat,
  musicPrompt, setMusicPrompt,
  genre, setGenre,
  mood, setMood,
  duration, setDuration,
  isGenerating,
  onGenerate
}) {
  const color = selectedModel.color || "#10b981";

  return (
    <div className="flex flex-col h-full bg-[#0a0618]/30 backdrop-blur-[60px] relative border-r border-white/5 shadow-[20px_0_40px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Studio Identity Header */}
      <div className="pt-20 lg:pt-24 border-b border-white/5 relative z-20 bg-white/[0.02] backdrop-blur-3xl">
        <div className="h-16 px-6 flex items-center gap-4">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg"
            style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, color }}
          >
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-black text-[10px] uppercase tracking-[0.4em] italic leading-none">Harmonic Engine</h3>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1.5">Acoustic Processor v2.2</p>
          </div>
        </div>
      </div>

      {/* Scrollable Configuration Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-4 relative z-10">

      {/* Section: Main Input */}
      <div className="px-6 space-y-6 pb-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">
               {isTTS ? "Acoustic Command" : "Melodic Prompt"}
            </label>
            <Activity className="w-3.5 h-3.5 text-emerald-500/40 animate-pulse" />
          </div>
          <div className="relative group">
            <textarea
              value={isTTS ? text : musicPrompt}
              onChange={(e) => isTTS ? setText(e.target.value) : setMusicPrompt(e.target.value)}
              placeholder={isTTS ? "Enter text for synthesis..." : "Describe the aural composition..."}
              rows={2}
              className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-[13px] text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-white/10 focus:bg-white/[0.04] transition-all resize-none shadow-xl leading-relaxed"
            />
          </div>
        </div>

        {/* Dynamic Controls based on Type */}
        {isTTS ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic ml-1">Vocal Profile</span>
              <div className="grid grid-cols-2 gap-2">
                {TTS_VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`p-3 rounded-xl text-left border transition-all duration-300 group ${
                      selectedVoice === voice.id ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10 hover:text-zinc-500'
                    }`}
                    style={selectedVoice === voice.id ? {
                      backgroundColor: `${color}15`,
                      borderColor: `${color}40`,
                      color: '#ffffff',
                      boxShadow: `0 0 15px ${color}08`
                    } : {}}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] transition-colors ${selectedVoice === voice.id ? 'bg-emerald-500 text-white' : 'bg-white/5 text-zinc-800'}`}>
                        {voice.icon}
                      </div>
                      <span className="font-black text-[11px] tracking-tighter uppercase">{voice.label}</span>
                    </div>
                    <p className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest leading-none truncate">{voice.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Synthesis Speed</span>
                <span className="text-[10px] font-black italic" style={{ color }}>{speed}x</span>
              </div>
              <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                   className="absolute h-full transition-all duration-300" 
                   style={{ width: `${((speed-0.5)/1.5)*100}%`, backgroundColor: color }} 
                />
                <input 
                  type="range" min="0.5" max="2" step="0.1" 
                  value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" 
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Temporal Duration</span>
                  <span className="text-[10px] font-black italic" style={{ color }}>{duration}s</span>
                </div>
                <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                     className="absolute h-full transition-all duration-300" 
                     style={{ width: `${(duration/120)*100}%`, backgroundColor: color }} 
                  />
                  <input 
                    type="range" min="5" max="120" step="5" 
                    value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" 
                  />
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="h-px bg-white/5 mx-6 mb-6" />

      {/* Engine Status Card */}
      <div className="px-6 mb-8">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
           <div className="relative z-10 flex items-center justify-between">
              <div className="min-w-0">
                 <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em] mb-1">Acoustic Logic Unit</p>
                 <h4 className="text-xs font-black text-white italic truncate pr-2">{selectedModel.name}</h4>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                 <span className="text-[8px] font-black text-emerald-500 tracking-tighter uppercase italic">Active</span>
              </div>
           </div>
        </div>
      </div>

      </div>
      
      {/* Generation Bar */}
      <div className="mt-auto p-6 bg-white/[0.02] border-t border-white/5 backdrop-blur-3xl relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.3)]">
        <button
          onClick={onGenerate}
          disabled={isGenerating || !(isTTS ? text : musicPrompt).trim()}
          className="w-full py-4 rounded-[1.2rem] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 disabled:grayscale shadow-2xl relative overflow-hidden group/btn"
          style={{ 
            backgroundColor: (isTTS ? text : musicPrompt).trim() ? color : '#ffffff',
            color: (isTTS ? text : musicPrompt).trim() ? '#ffffff' : '#000000',
            boxShadow: (isTTS ? text : musicPrompt).trim() ? `0 10px 30px ${color}30` : 'none'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
          {isGenerating ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Activity className="w-4 h-4" />
              </motion.div>
              <span>Synthesizing...</span>
            </>
          ) : (
            <>
              <span>Synthesize Audio</span> <Zap className="w-4 h-4 fill-current" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
