import React, { useState, useRef, useEffect } from "react";
import {
  Music, Play, Pause, Download, Loader2, XCircle, Mic,
  Bookmark, History, Volume2, X, Globe, Sparkles, Settings2, Activity, Zap, ActivitySquare, Speaker,
  PanelLeftClose, PanelLeftOpen, Layout
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase/firebaseApp";
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { DEFAULT_PRESETS } from "./models";

import BackgroundFilters from '../components/chat/BackgroundFilters';
import AudioEngineBg from '../assets/backgrounds/motif_audio_bg.png';
import StudioLayout from '../components/shared/StudioLayout';
import { useStudioPanels } from '../context/StudioPanelContext';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const TTS_VOICES = [
  { id: "alloy", label: "Alloy", desc: "Semleges, kiegyensúlyozott" },
  { id: "echo", label: "Echo", desc: "Melankolikus, mély" },
  { id: "fable", label: "Fable", desc: "Kifejező, brit akcentus" },
  { id: "onyx", label: "Onyx", desc: "Mély, tekintélyes" },
  { id: "nova", label: "Nova", desc: "Energikus, barátságos" },
  { id: "shimmer", label: "Shimmer", desc: "Lágy, kellemes" },
];

const TTS_FORMATS = ["mp3", "opus", "aac", "flac"];
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

const RIVA_VOICES = {
  "EN-US": [
    { name: "Aria", desc: "Professzionális női", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Diego", desc: "Férfi hang", emotions: [] },
    { name: "Isabela", desc: "Spanyolos akcentus", emotions: [] },
    { name: "Jason", desc: "Barátságos, fiatalos", emotions: ["Neutral", "Angry", "Calm", "Happy"] },
    { name: "Leo", desc: "Mély, nyugodt", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Sad"] },
    { name: "Louise", desc: "Professzionális", emotions: [] },
    { name: "Mia", desc: "Barátságos, meleg", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Neutrális férfi", emotions: [] },
    { name: "Ray", desc: "Energikus férfi", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Sofia", desc: "Kellemes női", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
  ],
  "ES-US": [
    { name: "Aria", desc: "Spanyol női", emotions: [] },
    { name: "Diego", desc: "Expresszív férfi", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprise"] },
    { name: "Isabela", desc: "Expresszív női", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprise", "Sad"] },
    { name: "Jason", desc: "Spanyol férfi", emotions: [] },
    { name: "Leo", desc: "Spanyol férfi", emotions: [] },
    { name: "Louise", desc: "Spanyol női", emotions: [] },
    { name: "Mia", desc: "Spanyol női", emotions: [] },
    { name: "Pascal", desc: "Spanyol férfi", emotions: [] },
    { name: "Ray", desc: "Spanyol férfi", emotions: [] },
    { name: "Sofia", desc: "Spanyol női", emotions: [] },
  ],
  "FR-FR": [
    { name: "Aria", desc: "Francia női", emotions: [] },
    { name: "Diego", desc: "Francia férfi", emotions: [] },
    { name: "Isabela", desc: "Francia női", emotions: [] },
    { name: "Jason", desc: "Francia férfi", emotions: [] },
    { name: "Leo", desc: "Francia férfi", emotions: [] },
    { name: "Louise", desc: "Francia női", emotions: [] },
    { name: "Mia", desc: "Francia női", emotions: [] },
    { name: "Pascal", desc: "Expresszív férfi", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Ray", desc: "Francia férfi", emotions: [] },
    { name: "Sofia", desc: "Francia női", emotions: [] },
  ],
  "DE-DE": [
    { name: "Diego", desc: "Német férfi", emotions: [] },
    { name: "Mia", desc: "Német női", emotions: [] },
    { name: "Pascal", desc: "Német férfi", emotions: [] },
    { name: "Sofia", desc: "Német női", emotions: [] },
  ],
  "ZH-CN": [
    { name: "Aria", desc: "Kínai női", emotions: [] },
    { name: "Diego", desc: "Kínai férfi", emotions: [] },
    { name: "HouZhen", desc: "Kínai férfi", emotions: [] },
    { name: "Isabela", desc: "Kínai női", emotions: [] },
    { name: "Long", desc: "Kínai férfi", emotions: [] },
    { name: "Louise", desc: "Kínai női", emotions: [] },
    { name: "Mia", desc: "Kínai női", emotions: [] },
    { name: "North", desc: "Kínai férfi", emotions: [] },
    { name: "Pascal", desc: "Kínai férfi", emotions: [] },
    { name: "Ray", desc: "Kínai férfi", emotions: [] },
    { name: "Siwei", desc: "Kínai női", emotions: [] },
  ],
  "IT-IT": [
    { name: "Isabela", desc: "Olasz női", emotions: [] },
    { name: "Pascal", desc: "Olasz férfi", emotions: [] },
  ],
  "VI-VN": [
    { name: "Aria", desc: "Vietnámi női", emotions: [] },
    { name: "Diego", desc: "Vietnámi férfi", emotions: [] },
    { name: "Isabela", desc: "Vietnámi női", emotions: [] },
    { name: "Jason", desc: "Vietnámi férfi", emotions: [] },
    { name: "Le", desc: "Vietnámi férfi", emotions: [] },
    { name: "Long", desc: "Expresszív férfi", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Fearful", "Happy", "Sad"] },
    { name: "Louise", desc: "Vietnámi női", emotions: [] },
    { name: "Mia", desc: "Vietnámi női", emotions: [] },
    { name: "North", desc: "Vietnámi férfi", emotions: [] },
    { name: "Pascal", desc: "Vietnámi férfi", emotions: [] },
    { name: "Ray", desc: "Vietnámi férfi", emotions: [] },
    { name: "Sofia", desc: "Vietnámi női", emotions: [] },
  ],
};

const EMOTION_EMOJI = {
  Neutral: "😐",
  Angry: "😠",
  Calm: "😌",
  Happy: "😊",
  Sad: "😢",
  Fearful: "😨",
  Disgust: "🤢",
  PleasantSurprise: "😲",
};

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

export default function AudioPanel({ selectedModel, userId, getIdToken, isGlobalOpen, toggleGlobalSidebar, globalSidebar }) {
  const { registerPanel, unregisterPanel } = useStudioPanels();

  // Register panels (Audio only has L1 + L2, no archive)
  useEffect(() => {
    registerPanel('L1');
    registerPanel('L2');
    return () => {
      unregisterPanel('L1');
      unregisterPanel('L2');
    };
  }, [registerPanel, unregisterPanel]);

  const isTTS = selectedModel.audioType === "tts";
  const isNvidiaRiva = selectedModel.provider === "nvidia-riva";

  const [activeTab, setActiveTab] = useState("generate");

  // OpenAI / ElevenLabs
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [speed, setSpeed] = useState(1.0);
  const [audioFormat, setAudioFormat] = useState("mp3");

  // NVIDIA Riva
  const [rivaLang, setRivaLang] = useState("EN-US");
  const [rivaVoiceName, setRivaVoiceName] = useState("Aria");
  const [rivaEmotion, setRivaEmotion] = useState("Neutral");

  const rivaVoices = RIVA_VOICES[rivaLang] || RIVA_VOICES["EN-US"];
  const rivaVoiceObj = rivaVoices.find((v) => v.name === rivaVoiceName) || rivaVoices[0];
  const hasEmotions = (rivaVoiceObj?.emotions?.length || 0) > 0;

  useEffect(() => {
    const first = (RIVA_VOICES[rivaLang] || [])[0];
    if (first) {
      setRivaVoiceName(first.name);
      setRivaEmotion(first.emotions[0] || "");
    }
  }, [rivaLang]);

  useEffect(() => {
    if (rivaVoiceObj) setRivaEmotion(rivaVoiceObj.emotions[0] || "");
  }, [rivaVoiceName]);

  const buildRivaVoiceName = () => {
    const base = `Magpie-Multilingual.${rivaLang}.${rivaVoiceName}`;
    return hasEmotions && rivaEmotion ? `${base}.${rivaEmotion}` : base;
  };

  // Music
  const [musicPrompt, setMusicPrompt] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [duration, setDuration] = useState(30);
  const [instrumental, setInstrumental] = useState(true);

  // Common
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [presets, setPresets] = useState(
    DEFAULT_PRESETS.audio.filter((p) =>
      isTTS ? ["audio_natural", "audio_dramatic"].includes(p.id)
        : ["music_cinematic", "music_lofi"].includes(p.id)
    )
  );
  const [activePresetId, setActivePresetId] = useState(isTTS ? "audio_natural" : "music_cinematic");
  const [presetSaveOpen, setPresetSaveOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const [leftOpen, setLeftOpen] = useState(true);
  useEffect(() => { setLeftOpen(isGlobalOpen); }, [isGlobalOpen]);

  const [leftSecondaryOpen, setLeftSecondaryOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [offsets, setOffsets] = useState({ left: 320, right: 0 });

  const audioRef = useRef(null);
  const color = selectedModel.color || "#10b981";

  useEffect(() => { loadHistory(); }, [userId, selectedModel.id]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.onended = () => setIsPlaying(false);
  }, [audioUrl]);

  const loadHistory = async () => {
    if (!userId) return;
    try {
      const ref = collection(db, "audio_generations", userId, selectedModel.id);
      const q = query(ref, orderBy("createdAt", "desc"), limit(20));
      const snap = await getDocs(q);
      setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch { }
  };

  const applyPreset = (preset) => {
    if (preset.speed !== undefined) setSpeed(preset.speed);
    if (preset.genre) setGenre(preset.genre);
    if (preset.mood) setMood(preset.mood);
    if (preset.duration) setDuration(preset.duration);
    setActivePresetId(preset.id);
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  const handleGenerate = async () => {
    const content = isTTS ? text : musicPrompt;
    if (!content.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    setIsPlaying(false);

    try {
      const token = getIdToken ? await getIdToken() : null;
      const endpoint = isTTS ? `${API_BASE}/api/generate-tts` : `${API_BASE}/api/generate-music`;

      let body;
      if (isTTS) {
        if (isNvidiaRiva) {
          const lc = rivaLang.toLowerCase().replace(/^(\w+)-(\w+)$/, (_, a, b) => `${a}-${b.toUpperCase()}`);
          body = {
            model: selectedModel.apiModel,
            provider: "nvidia-riva",
            text,
            voice: buildRivaVoiceName(),
            language_code: lc,
          };
        } else {
          body = { model: selectedModel.apiModel, provider: selectedModel.provider, text, voice: selectedVoice, speed, format: audioFormat };
        }
      } else {
        body = { apiId: selectedModel.apiId, prompt: musicPrompt, genre, mood, duration, instrumental };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setAudioUrl(data.audioUrl);

      if (userId) {
        try {
          await addDoc(collection(db, "audio_generations", userId, selectedModel.id), {
            audioUrl: data.audioUrl,
            type: isTTS ? "tts" : "music",
            [isTTS ? "text" : "prompt"]: content,
            ...(isTTS
              ? isNvidiaRiva
                ? { voice: buildRivaVoiceName(), lang: rivaLang, voiceName: rivaVoiceName, emotion: rivaEmotion }
                : { voice: selectedVoice, speed }
              : { genre, mood, duration }),
            modelId: selectedModel.id,
            createdAt: serverTimestamp(),
          });
          await loadHistory();
        } catch (saveErr) {
          console.warn("Előzmény mentési hiba:", saveErr.message);
        }
      }
    } catch (err) {
      setError(err.message || "Generálási hiba");
    } finally {
      setIsGenerating(false);
    }
  };

  const Select = ({ label, options, value, onChange }) => (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase text-zinc-600">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-2 text-[11px] text-zinc-200 focus:outline-none">
        <option value="">Select {label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <StudioLayout
      leftOpen={leftOpen}
      setLeftOpen={toggleGlobalSidebar}
      leftSecondaryOpen={leftSecondaryOpen}
      setLeftSecondaryOpen={setLeftSecondaryOpen}
      rightOpen={rightOpen}
      setRightOpen={setRightOpen}
      leftWidth={320}
      leftSecondaryWidth={392}
      leftSecondaryClosedWidth={0}
      onOffsetChange={setOffsets}
      leftSidebar={globalSidebar}
      leftSecondarySidebar={
        <div className="h-full flex flex-row overflow-hidden bg-[#060410]/60 backdrop-blur-3xl border-r border-white/5">
          <div className="w-[72px] h-full flex flex-col bg-[#030308] border-r border-white/5 pt-6 items-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg mb-8"
              style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, color }}
              title="Neural Forge"
            >
              {isTTS ? <Mic className="w-6 h-6" /> : <Music className="w-6 h-6" />}
            </div>

            <div className="flex flex-col gap-4">
              {[
                { id: "generate", label: "Forge", icon: Zap },
                { id: "presets", label: "Presets", icon: Bookmark },
                { id: "history", label: "History", icon: History },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setLeftSecondaryOpen(true);
                    }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border ${activeTab === tab.id
                        ? "bg-white/10 border-white/20 text-white shadow-lg"
                        : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400"
                      }`}
                    title={tab.label}
                    style={activeTab === tab.id ? { borderColor: `${color}40`, color } : {}}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>

            <div className="flex-1" />

            <button
              onClick={() => setLeftSecondaryOpen(!leftSecondaryOpen)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border ${leftSecondaryOpen
                  ? "bg-white/10 border-white/20 text-white shadow-lg"
                  : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400 mb-6"
                }`}
              title="Toggle Panel"
            >
              <Settings2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] italic leading-none">
                  {activeTab === "generate" ? (isTTS ? "Audio Generator" : "Music Engineer") : activeTab.toUpperCase()}
                </h3>
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-2">Neural Unit v4.0</p>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-8">
                {activeTab === "generate" && (
                  <div className="space-y-8">
                    {isTTS ? (
                      <div className="space-y-4">
                        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text to synthesize..." rows={4} className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-4 text-[13px] text-zinc-200" />
                        {isNvidiaRiva ? (
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest italic">Primary Language</span>
                              <select value={rivaLang} onChange={(e) => setRivaLang(e.target.value)} className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-[11px] text-zinc-200 focus:outline-none">
                                {RIVA_LANGUAGES.map(lang => <option key={lang.code} value={lang.code} className="bg-zinc-900">{lang.label}</option>)}
                              </select>
                            </div>
                            <div className="space-y-4">
                              <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest italic">Voice Profile</span>
                              <div className="grid grid-cols-2 gap-2">
                                {rivaVoices.map(v => (
                                  <button key={v.name} onClick={() => setRivaVoiceName(v.name)} className={`p-3 rounded-xl border text-left transition-all ${rivaVoiceName === v.name ? 'bg-white/5 border-white/20' : 'bg-transparent border-white/5'}`}>
                                    <div className="text-[10px] font-bold text-white">{v.name}</div>
                                    <div className="text-[8px] text-zinc-500">{v.desc}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                            {hasEmotions && (
                              <div className="space-y-4">
                                <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest italic">Emotional Inflection</span>
                                <div className="flex flex-wrap gap-2">
                                  {rivaVoiceObj.emotions.map(emo => (
                                    <button key={emo} onClick={() => setRivaEmotion(emo)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${rivaEmotion === emo ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-zinc-500'}`}>
                                      {EMOTION_EMOJI[emo] || ""} {emo}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest italic">Voice Persona</span>
                              <div className="grid grid-cols-2 gap-2">
                                {TTS_VOICES.map(v => (
                                  <button key={v.id} onClick={() => setSelectedVoice(v.id)} className={`p-3 rounded-xl border text-left transition-all ${selectedVoice === v.id ? 'bg-white/5 border-white/20' : 'bg-transparent border-white/5'}`}>
                                    <div className="text-[10px] font-bold text-white mb-0.5">{v.label}</div>
                                    <div className="text-[8px] text-zinc-500 line-clamp-1">{v.desc}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-5">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest italic">Vocal Velocity</span>
                                <span className="text-[10px] font-mono text-zinc-400">{speed}x</span>
                              </div>
                              <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full accent-white h-1 bg-white/5 rounded-full appearance-none cursor-pointer" />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">Command</label>
                          <textarea value={musicPrompt} onChange={(e) => setMusicPrompt(e.target.value)} placeholder="Structural composition..." rows={3} className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-4 text-[13px] text-zinc-200" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Select label="Genre" options={MUSIC_GENRES} value={genre} onChange={setGenre} />
                          <Select label="Mood" options={MUSIC_MOODS} value={mood} onChange={setMood} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase text-zinc-600">Duration ({duration}s)</label>
                          <input type="range" min="10" max="60" step="5" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full accent-white h-1 bg-white/5 rounded-full appearance-none cursor-pointer" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "presets" && (
                  <div className="space-y-3">
                    {presets.map(p => (
                      <button key={p.id} onClick={() => applyPreset(p)} className="w-full p-4 rounded-xl border border-white/5 bg-white/[0.02] text-left hover:border-white/10 transition-all">
                        <div className="text-[10px] font-black text-white uppercase">{p.name}</div>
                        <div className="text-[8px] text-zinc-600 uppercase">{p.type}</div>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "history" && (
                  <div className="space-y-3">
                    {history.map(h => (
                      <div key={h.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-[10px] text-zinc-500 italic">
                        {h.text || h.prompt}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all" style={{ backgroundColor: color }}>
                  {isGenerating ? "Synthesizing..." : "Initiate Forge"}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="h-full w-full relative overflow-hidden flex flex-col">
        <BackgroundFilters />
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 liquid-wave opacity-60 scale-110 animate-[ken-burns_60s_infinite_alternate_ease-in-out]">
            <img src={AudioEngineBg} alt="bg" className="w-full h-full object-cover saturate-[1.2] brightness-[0.8]" />
          </div>
          <div className="absolute inset-0 opacity-40 mix-blend-screen">
            <div
              className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px]"
              style={{ background: `${color}20` }}
            />
            <div
              className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[140px]"
              style={{ background: `${color}15` }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#03000a]/80 via-transparent to-[#03000a]" />
        </div>

        <div className="flex-1 relative z-10 overflow-hidden flex flex-col items-center justify-center p-8">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <MiniWaveform color={color} isPlaying={true} />
              </motion.div>
            ) : audioUrl ? (
              <motion.div key="player" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl p-8 rounded-[2rem] border border-white/5 bg-white/[0.01] backdrop-blur-xl">
                <div className="flex justify-between items-start mb-8">
                  <h3 className="text-2xl font-black text-white uppercase tracking-wider">Audio Forged</h3>
                  <button onClick={togglePlay} className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: color }}>
                    {isPlaying ? <Pause /> : <Play />}
                  </button>
                </div>
                <MiniWaveform color={color} isPlaying={isPlaying} />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center opacity-30">
                <Mic className="w-12 h-12 mb-4" />
                <h4 className="text-sm font-black uppercase tracking-widest">Awaiting Parameters</h4>
              </motion.div>
            )}
          </AnimatePresence>
          <audio ref={audioRef} src={audioUrl || ""} />
        </div>
      </div>
    </StudioLayout>
  );
}