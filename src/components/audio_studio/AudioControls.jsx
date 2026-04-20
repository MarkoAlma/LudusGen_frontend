import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Music, Zap, Settings2, Sparkles, ChevronDown,
  Globe, Volume2, Activity, Play, Languages, Smile, Clock
} from 'lucide-react';
import { ALL_MODELS } from '../../ai_components/models';

const TTS_VOICES = [
  { id: "alloy", label: "Alloy", desc: "Semleges, kiegyensúlyozott" },
  { id: "echo", label: "Echo", desc: "Melankolikus, mély" },
  { id: "fable", label: "Fable", desc: "Kifejező, brit akcentus" },
  { id: "onyx", label: "Onyx", desc: "Mély, tekintélyes" },
  { id: "nova", label: "Nova", desc: "Energikus, barátságos" },
  { id: "shimmer", label: "Shimmer", desc: "Lágy, kellemes" },
];

const MUSIC_GENRES = ["cinematic orchestral", "lo-fi hip hop", "electronic", "jazz", "ambient", "rock", "classical", "folk", "blues", "pop", "synthwave"];
const MUSIC_MOODS = ["epic", "chill", "energetic", "melancholic", "happy", "dark", "romantic", "tense", "peaceful", "mysterious"];

const RIVA_LANGUAGES = [
  { code: "EN-US", label: "English (US)" },
  { code: "ES-US", label: "Spanish (US)" },
  { code: "FR-FR", label: "Français" },
  { code: "DE-DE", label: "Deutsch" },
  { code: "ZH-CN", label: "中文 (简体)" },
  { code: "IT-IT", label: "Italiano" },
  { code: "VI-VN", label: "Tiếng Việt" },
];

const EMOTION_EMOJI = {
  Neutral: "😐", Angry: "😠", Calm: "😌", Happy: "😊",
  Sad: "😢", Fearful: "😨", Disgust: "🤢", PleasantSurprise: "😲",
};

export default function AudioControls({
  selectedModel,
  onModelChange,
  isGenerating,
  onGenerate,

  // TTS State
  text, setText,
  selectedVoice, setSelectedVoice,
  speed, setSpeed,

  // Riva State
  rivaLang, setRivaLang,
  rivaVoices,
  rivaVoiceName, setRivaVoiceName,
  rivaEmotion, setRivaEmotion,
  hasEmotions,

  // Music State
  musicPrompt, setMusicPrompt,
  genre, setGenre,
  mood, setMood,
  duration, setDuration,
  instrumental, setInstrumental,

  activeTab,
  setActiveTab
}) {
  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const color = selectedModel.color || "#10b981";

  const isTTS = selectedModel.audioType === "tts";
  const isNvidiaRiva = selectedModel.provider === "nvidia-riva";

  const availableModels = ALL_MODELS.filter(m => m.panelType === 'audio');

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const Select = ({ label, options, value, onChange, icon: Icon }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        {Icon && <Icon className="w-3 h-3 text-zinc-600" />}
        <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">{label}</label>
      </div>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/[0.01] border border-white/5 rounded-xl pl-4 pr-10 py-3 text-[11px] font-bold text-zinc-300 focus:outline-none focus:border-white/10 focus:bg-white/[0.03] transition-all appearance-none cursor-pointer group-hover:border-white/10"
        >
          {options.map(o => (
            <option key={typeof o === 'string' ? o : o.code || o.id} value={typeof o === 'string' ? o : o.code || o.id} className="bg-[#0a0a14]">
              {typeof o === 'string' ? o : o.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600 group-hover:text-zinc-400 transition-colors">
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0618]/30 backdrop-blur-[60px] relative border-r border-white/5 shadow-[20px_0_40px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Model Dropdown Header */}
      <div className="pt-4 border-b border-white/5 relative z-20 bg-white/[0.02] backdrop-blur-3xl">
        <div className="h-16 px-4 flex items-center" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 w-full pl-2 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/8 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {isTTS ? <Mic className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
            </div>

            <div className="flex-1 min-w-0 text-left">
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em] leading-none mb-0.5">
                {isTTS ? 'Neural Synthesis' : 'Sonic Architecture'}
              </p>
              <p className="text-[12px] font-black text-white truncate leading-none">
                {selectedModel.name}
              </p>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-500 flex-shrink-0 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-4 right-4 mt-1 rounded-xl border border-white/10 bg-[#0d0d14]/98 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Audio Models</span>
                  <span className="text-[8px] text-zinc-600 font-bold">{availableModels.length} units</span>
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {availableModels.map(model => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onModelChange?.(model);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${selectedModel.id === model.id ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'}`}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: model.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-bold text-white truncate block">{model.name}</span>
                        <span className="text-[9px] text-zinc-600 font-medium">{model.provider}</span>
                      </div>
                      {selectedModel.id === model.id && (
                        <span className="text-[8px] font-black text-emerald-500 uppercase flex-shrink-0">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Controls Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-6 space-y-8">
        <div className="px-6 space-y-8">
          {/* Instruction Area */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">
                {isTTS ? 'Input Manuscript' : 'Musical Blueprint'}
              </label>
              <Sparkles className="w-3.5 h-3.5 text-primary opacity-30" />
            </div>
            <textarea
              value={isTTS ? text : musicPrompt}
              onChange={(e) => isTTS ? setText(e.target.value) : setMusicPrompt(e.target.value)}
              placeholder={isTTS ? "Type or paste transcript..." : "Describe a melody, style, or atmosphere..."}
              rows={4}
              className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-[13px] text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-white/10 transition-all resize-none leading-relaxed"
            />
          </div>

          <div className="h-px bg-white/5 mx-2" />

          {/* Persona / Style Parameters */}
          <div className="space-y-8">
            <div className="flex items-center gap-2 px-1">
              <Settings2 className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Core Parameters</span>
            </div>

            {isTTS ? (
              <div className="space-y-8">
                {isNvidiaRiva ? (
                  <>
                    <Select
                      label="Synthesis Language"
                      options={RIVA_LANGUAGES}
                      value={rivaLang}
                      onChange={setRivaLang}
                      icon={Globe}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <Activity className="w-3 h-3 text-zinc-600" />
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Vocal Profile</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {rivaVoices.map(v => (
                          <button
                            key={v.name}
                            onClick={() => setRivaVoiceName(v.name)}
                            className={`flex flex-col items-center py-2.5 rounded-xl border transition-all duration-300 ${rivaVoiceName === v.name ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10 hover:text-zinc-500'}`}
                            style={rivaVoiceName === v.name ? {
                              backgroundColor: `${color}15`,
                              borderColor: `${color}40`,
                              color: color,
                              boxShadow: `0 0 15px ${color}08`
                            } : {}}
                          >
                            <div className={`text-[10px] font-black uppercase tracking-tighter ${rivaVoiceName === v.name ? 'text-white' : ''}`}>{v.name}</div>
                            <div className="text-[7px] font-bold opacity-40 uppercase tracking-widest mt-0.5">{v.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {hasEmotions && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                          <Smile className="w-3 h-3 text-zinc-600" />
                          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Emotional Bias</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(rivaVoices.find(v => v.name === rivaVoiceName)?.emotions || []).map(emo => (
                            <button
                              key={emo}
                              onClick={() => setRivaEmotion(emo)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black border transition-all duration-300 ${rivaEmotion === emo ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10 hover:text-zinc-500'}`}
                              style={rivaEmotion === emo ? {
                                backgroundColor: `${color}15`,
                                borderColor: `${color}40`,
                                color: color,
                                boxShadow: `0 0 15px ${color}08`
                              } : {}}
                            >
                              <span className={rivaEmotion === emo ? 'text-white' : ''}>{EMOTION_EMOJI[emo] || ""}</span> {emo}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <Activity className="w-3 h-3 text-zinc-600" />
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Vocal Identity</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {TTS_VOICES.map(v => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVoice(v.id)}
                            className={`flex flex-col items-center py-2.5 rounded-xl border transition-all duration-300 ${selectedVoice === v.id ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10 hover:text-zinc-500'}`}
                            style={selectedVoice === v.id ? {
                              backgroundColor: `${color}15`,
                              borderColor: `${color}40`,
                              color: color,
                              boxShadow: `0 0 15px ${color}08`
                            } : {}}
                          >
                            <div className={`text-[10px] font-black uppercase tracking-tighter ${selectedVoice === v.id ? 'text-white' : ''}`}>{v.label}</div>
                            <div className="text-[7px] font-bold opacity-40 uppercase tracking-widest mt-0.5 truncate">{v.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-3 h-3 text-zinc-600" />
                          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Spectral Velocity</span>
                        </div>
                        <span className="text-[10px] font-black italic" style={{ color }}>{speed}x</span>
                      </div>
                      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="absolute h-full transition-all duration-300" style={{ width: `${((speed - 0.5) / 1.5) * 100}%`, backgroundColor: color }} />
                        <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Sonic Genre" options={MUSIC_GENRES} value={genre} onChange={setGenre} icon={Music} />
                  <Select label="Atmosphere" options={MUSIC_MOODS} value={mood} onChange={setMood} icon={Smile} />
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-zinc-600" />
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Sequence Duration</span>
                    </div>
                    <span className="text-[10px] font-black italic" style={{ color }}>{duration}s</span>
                  </div>
                  <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="absolute h-full transition-all duration-300" style={{ width: `${((duration - 10) / 110) * 100}%`, backgroundColor: color }} />
                    <input type="range" min="10" max="120" step="5" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" />
                  </div>
                </div>

                <button
                  onClick={() => setInstrumental(!instrumental)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 group ${instrumental ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700'}`}
                  style={instrumental ? { backgroundColor: `${color}08`, borderColor: `${color}20`, color } : {}}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${instrumental ? 'bg-primary/20 text-white' : 'bg-white/10 text-zinc-800'}`}>
                      <Mic className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Instrumental Only</span>
                  </div>
                  <div className="w-8 h-4 rounded-full relative transition-colors" style={{ backgroundColor: instrumental ? color : 'rgba(255,255,255,0.05)' }}>
                    <motion.div
                      animate={{ x: instrumental ? 18 : 3 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-md"
                    />
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-6 bg-white/[0.02] border-t border-white/5 backdrop-blur-3xl relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.3)]">
        <button
          onClick={onGenerate}
          disabled={isGenerating || (isTTS ? !text.trim() : !musicPrompt.trim())}
          className="w-full py-4 rounded-[1.2rem] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 shadow-2xl relative overflow-hidden group/btn"
          style={{
            backgroundColor: (isTTS ? text.trim() : musicPrompt.trim()) ? color : '#ffffff',
            color: (isTTS ? text.trim() : musicPrompt.trim()) ? '#ffffff' : '#000000',
            boxShadow: (isTTS ? text.trim() : musicPrompt.trim()) ? `0 10px 30px ${color}30` : 'none'
          }}
        >
          {isGenerating ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Activity className="w-4 h-4" />
              </motion.div>
              <span>Forging...</span>
            </>
          ) : (
            <>
              <span>Initiate Forge</span> <Zap className="w-4 h-4 fill-current" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
