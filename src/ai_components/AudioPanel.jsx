import React, { useState, useRef, useEffect } from "react";
import {
  Music, Play, Pause, Download, Loader2, XCircle, Mic,
  Bookmark, History, Volume2, X, Globe, Sparkles, Settings2, Activity, Zap, ActivitySquare, Speaker
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase/firebaseApp";
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { DEFAULT_PRESETS } from "./models";

import BackgroundFilters from '../components/chat/BackgroundFilters';
import AudioEngineBg from '../assets/backgrounds/motif_audio_bg.png';

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

export default function AudioPanel({ selectedModel, userId, getIdToken }) {
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

  const savePreset = () => {
    if (!newPresetName.trim()) return;
    const preset = {
      id: Date.now().toString(),
      name: newPresetName,
      ...(isTTS ? { speed } : { genre, mood, duration }),
      createdAt: new Date().toISOString(),
    };
    setPresets((p) => [...p, preset]);
    setNewPresetName("");
    setPresetSaveOpen(false);
  };

  return (
    <div className="flex h-full w-full bg-[#03000a] text-white overflow-hidden relative selection:bg-primary/30">
      <BackgroundFilters />

      {/* Cinematic Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 liquid-wave opacity-60 scale-110 animate-[ken-burns_60s_infinite_alternate_ease-in-out]">
          <img src={AudioEngineBg} alt="bg" className="w-full h-full object-cover saturate-[1.2] brightness-[0.8]" />
        </div>
        <div className="absolute inset-0 opacity-40 mix-blend-screen">
          <div
            className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] animate-[aurora-flow_25s_infinite_alternate_ease-in-out]"
            style={{ background: `${color}20` }}
          />
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[140px] animate-[aurora-flow_30s_infinite_alternate_reverse_ease-in-out]"
            style={{ background: `${color}15` }}
          />
        </div>
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none grain-overlay"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#03000a]/80 via-transparent to-[#03000a]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#03000a]/60 via-transparent to-[#03000a]/60" />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-black via-black/20 to-transparent opacity-90" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
      </div>

      {/* Left: Configuration Panel matching ImageControls */}
      <div className="w-80 xl:w-96 h-full flex flex-col bg-[#0a0618]/30 backdrop-blur-[60px] relative border-r border-white/5 shadow-[20px_0_40px_rgba(0,0,0,0.3)] overflow-hidden z-20">
        
        {/* Studio Identity Header */}
        <div className="pt-20 lg:pt-24 border-b border-white/5 relative z-20 bg-white/[0.02] backdrop-blur-3xl">
          <div className="h-16 px-6 flex items-center gap-4">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg"
              style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, color }}
            >
              {isTTS ? <Mic className="w-5 h-5" /> : <Music className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-white font-black text-[10px] uppercase tracking-[0.4em] italic leading-none">Neural Forge</h3>
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1.5">{isTTS ? "Audio Generator v4.0" : "Music Engineer v2.0"}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Configuration Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-4 h-full relative z-10">

          <div className="px-6 space-y-6 pb-6 mt-2">
            {/* TABS */}
            <div className="space-y-3">
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1 italic">Mode</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "generate", label: "Forge" },
                  { id: "presets", label: "Presets" },
                  { id: "history", label: "History" },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 rounded-xl text-[9px] font-black tracking-wider transition-all border duration-300 uppercase ${
                      activeTab === tab.id ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10 hover:text-zinc-500'
                    }`}
                    style={activeTab === tab.id ? {
                      backgroundColor: `${color}15`,
                      borderColor: `${color}40`,
                      color: color,
                      boxShadow: `0 0 15px ${color}08`
                    } : {}}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-white/5 mx-2 my-2" />

            {/* ── GENERATE TAB ── */}
            {activeTab === "generate" && (
              <div className="space-y-6">
                {isTTS ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">
                          Positive Command
                        </label>
                        <Sparkles className="w-3.5 h-3.5 opacity-30 animate-pulse" style={{ color }} />
                      </div>
                      <textarea value={text} onChange={(e) => setText(e.target.value)}
                        placeholder="Provide textual context for synthesis..." rows={4}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-[13px] text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-white/10 focus:bg-white/[0.04] transition-all resize-none shadow-xl leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1 mb-2">
                         <Settings2 className="w-3.5 h-3.5 text-zinc-600" />
                         <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Core Parameters</span>
                      </div>

                      {isNvidiaRiva ? (
                        <>
                          <div>
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic ml-1">Linguistic Matrix</span>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {RIVA_LANGUAGES.map((lang) => (
                                <button key={lang.code} onClick={() => setRivaLang(lang.code)}
                                  className={`py-2 px-2 rounded-xl text-[9px] font-black transition-all border duration-300 uppercase ${
                                    rivaLang === lang.code ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10 hover:text-zinc-500'
                                  }`}
                                  style={rivaLang === lang.code ? { backgroundColor: `${color}15`, borderColor: `${color}40`, color: color } : {}}
                                >
                                  {lang.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic ml-1">Voice Signature</span>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {rivaVoices.map((voice) => {
                                const active = rivaVoiceName === voice.name;
                                return (
                                  <button key={voice.name} onClick={() => setRivaVoiceName(voice.name)}
                                    className={`p-2 rounded-xl text-left border transition-all duration-300 ${
                                      active ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10'
                                    }`}
                                    style={active ? { backgroundColor: `${color}15`, borderColor: `${color}40`, color: color } : {}}
                                  >
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="text-[10px] font-black uppercase">{voice.name}</span>
                                    </div>
                                    <p className="text-[8px] opacity-60 uppercase">{voice.desc}</p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {hasEmotions && (
                            <div className="pt-2">
                              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic ml-1">Emotional Resonance</span>
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                {rivaVoiceObj.emotions.map((em) => (
                                  <button key={em} onClick={() => setRivaEmotion(em)}
                                    className={`py-1.5 px-2 rounded-xl text-[9px] font-black transition-all border block text-center truncate ${
                                      rivaEmotion === em ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10'
                                    }`}
                                    style={rivaEmotion === em ? { backgroundColor: `${color}15`, borderColor: `${color}40`, color: color } : {}}
                                  >
                                    {em}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic ml-1">Voice Signature</span>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {TTS_VOICES.map((voice) => (
                                <button key={voice.id} onClick={() => setSelectedVoice(voice.id)}
                                  className={`p-2 rounded-xl text-left border transition-all duration-300 ${
                                    selectedVoice === voice.id ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10'
                                  }`}
                                  style={selectedVoice === voice.id ? { backgroundColor: `${color}15`, borderColor: `${color}40`, color: color } : {}}
                                >
                                  <span className="text-[10px] font-black uppercase">{voice.label}</span>
                                  <p className="text-[8px] opacity-60 uppercase mt-0.5">{voice.desc}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                      
                          <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Acoustic Speed</span>
                              <span className="text-[10px] font-black italic" style={{ color }}>{speed}x</span>
                            </div>
                            <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="absolute h-full transition-all duration-300" style={{ width: `${(speed/4)*100}%`, backgroundColor: color }} />
                              <input type="range" min="0.25" max="4" step="0.05" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" />
                            </div>
                          </div>

                          <div className="pt-2">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic ml-1">Export Format</span>
                            <div className="grid grid-cols-4 gap-2 mt-2">
                              {TTS_FORMATS.map((fmt) => (
                                <button key={fmt} onClick={() => setAudioFormat(fmt)}
                                  className={`py-2 rounded-xl text-[9px] font-black transition-all border uppercase ${
                                    audioFormat === fmt ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10'
                                  }`}
                                  style={audioFormat === fmt ? { backgroundColor: `${color}15`, borderColor: `${color}40`, color: color } : {}}
                                >
                                  {fmt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">
                          Positive Command
                        </label>
                        <Sparkles className="w-3.5 h-3.5 opacity-30 animate-pulse" style={{ color }} />
                      </div>
                      <textarea value={musicPrompt} onChange={(e) => setMusicPrompt(e.target.value)}
                        placeholder="Determine structural composition of audio..." rows={4}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-[13px] text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-white/10 focus:bg-white/[0.04] transition-all resize-none shadow-xl leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 px-1 mb-2">
                         <Settings2 className="w-3.5 h-3.5 text-zinc-600" />
                         <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Core Parameters</span>
                      </div>

                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic ml-1">Genre</span>
                      <div className="flex flex-wrap gap-2">
                        {MUSIC_GENRES.map((g) => (
                          <button key={g} onClick={() => setGenre(genre === g ? "" : g)}
                            className={`px-3 py-1.5 rounded-full text-[9px] font-black transition-all border uppercase ${
                              genre === g ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10'
                            }`}
                            style={genre === g ? { backgroundColor: `${color}15`, borderColor: `${color}40`, color: color } : {}}
                          >
                            {g}
                          </button>
                        ))}
                      </div>

                      <div className="pt-2">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic ml-1">Sentiment (Mood)</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {MUSIC_MOODS.map((m) => (
                            <button key={m} onClick={() => setMood(mood === m ? "" : m)}
                              className={`px-3 py-1.5 rounded-full text-[9px] font-black transition-all border uppercase ${
                                mood === m ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10'
                              }`}
                              style={mood === m ? { backgroundColor: `${color}15`, borderColor: `${color}40`, color: color } : {}}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 pt-4">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Track Duration</span>
                          <span className="text-[10px] font-black italic" style={{ color }}>{duration}s</span>
                        </div>
                        <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="absolute h-full transition-all duration-300" style={{ width: `${(duration/90)*100}%`, backgroundColor: color }} />
                          <input type="range" min="5" max="90" step="5" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" />
                        </div>
                      </div>

                      {/* Instrumental Toggle */}
                      <button onClick={() => setInstrumental(!instrumental)}
                        className={`mt-4 w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 group ${
                          instrumental ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700'
                        }`}
                        style={instrumental ? { backgroundColor: `${color}08`, borderColor: `${color}20`, color: color } : {}}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg transition-colors ${instrumental ? 'text-white shadow-lg' : 'bg-white/10 text-zinc-800'}`} style={instrumental ? { backgroundColor: color } : {}}>
                            <Speaker className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Instrumental Only</span>
                        </div>
                        <div className="w-8 h-4 rounded-full relative transition-colors shadow-inner" style={{ backgroundColor: instrumental ? color : 'rgba(255,255,255,0.05)' }}>
                          <motion.div animate={{ x: instrumental ? 18 : 3 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }} className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-md" />
                        </div>
                      </button>

                    </div>
                  </>
                )}
                
                {/* Save Preset inline */}
                {presetSaveOpen ? (
                  <div className="flex gap-2">
                    <input value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Preset Name..."
                      className="flex-1 bg-white/[0.02] border rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none"
                      style={{ borderColor: `${color}40` }}
                      autoFocus onKeyDown={(e) => e.key === "Enter" && savePreset()} 
                    />
                    <button onClick={savePreset} className="px-3 rounded-xl text-[10px] font-black uppercase" style={{ backgroundColor: color }}>Save</button>
                    <button onClick={() => setPresetSaveOpen(false)} className="px-2 rounded-xl bg-white/5"><X className="w-4 h-4 text-zinc-500" /></button>
                  </div>
                ) : (
                  <button onClick={() => setPresetSaveOpen(true)} className="w-full py-3 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-all flex justify-center items-center gap-2">
                    <Bookmark className="w-3.5 h-3.5" /> Save Configuration
                  </button>
                )}
              </div>
            )}

            {/* ── PRESETS TAB ── */}
            {activeTab === "presets" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 mb-2">
                   <Bookmark className="w-3.5 h-3.5 text-zinc-600" />
                   <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Saved Banks</span>
                </div>
                {presets.map((preset) => {
                  const isActive = activePresetId === preset.id;
                  return (
                    <div key={preset.id} className={`p-4 rounded-2xl transition-all border ${isActive ? '' : 'bg-white/[0.01] border-white/5'}`}
                      style={isActive ? { backgroundColor: `${color}10`, borderColor: `${color}30` } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-white font-black uppercase tracking-wider">{preset.name}</span>
                          <div className="flex flex-wrap gap-2 mt-1.5 text-[9px] text-zinc-500 uppercase tracking-widest">
                            {preset.speed && <span>SPD:{preset.speed}x</span>}
                            {preset.genre && <span>{preset.genre}</span>}
                            {preset.mood && <span>{preset.mood}</span>}
                            {preset.duration && <span>{preset.duration}s</span>}
                          </div>
                        </div>
                        <button onClick={() => applyPreset(preset)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest`}
                          style={isActive ? { backgroundColor: `${color}25`, color: color } : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}
                        >
                          {isActive ? "Active" : "Apply"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === "history" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 mb-2">
                   <History className="w-3.5 h-3.5 text-zinc-600" />
                   <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Logs</span>
                </div>
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 border border-white/5 border-dashed rounded-2xl bg-white/[0.01]">
                    <ActivitySquare className="w-8 h-8 text-zinc-800 mb-3" />
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">No signals recorded.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div key={item.id} className="cursor-pointer p-3 rounded-xl transition-all hover:bg-white/5 border border-white/5 bg-white/[0.02]"
                        onClick={() => {
                          setAudioUrl(item.audioUrl);
                          if (item.text) setText(item.text);
                          if (item.prompt) setMusicPrompt(item.prompt);
                          if (item.lang) setRivaLang(item.lang);
                          if (item.voiceName) setRivaVoiceName(item.voiceName);
                          if (item.emotion) setRivaEmotion(item.emotion);
                        }}
                      >
                        <div className="flex flex-col gap-1">
                          <p className="text-white text-[10px] font-black truncate">{item.text || item.prompt}</p>
                          <div className="flex justify-between items-center opacity-60">
                             <p className="text-[8px] font-bold uppercase tracking-widest">
                               {item.type} {item.voiceName || item.voice || item.genre || ""}
                             </p>
                             {item.audioUrl && (
                               <a href={item.audioUrl} download className="p-1 hover:text-white" onClick={(e) => e.stopPropagation()}>
                                 <Download className="w-3 h-3" />
                               </a>
                             )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="px-6 mb-6">
            {/* Current Model Status Card */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
               <div className="relative z-10 flex items-center justify-between">
                  <div className="min-w-0">
                     <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em] mb-1">Active Neural Unit</p>
                     <h4 className="text-xs font-black text-white italic truncate pr-2">{selectedModel.name}</h4>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[8px] font-black text-emerald-500 tracking-tighter uppercase italic">Ready</span>
                  </div>
               </div>
            </div>
            
            {error && (
              <div className="mt-4 p-3 rounded-xl flex items-center gap-2 border border-red-500/30 bg-red-500/10">
                <XCircle className="w-4 h-4 text-red-500" />
                <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Generation Bar (Bottom) */}
        {activeTab === "generate" && (
          <div className="mt-auto p-6 bg-white/[0.02] border-t border-white/5 backdrop-blur-3xl relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.3)]">
            <button
              onClick={handleGenerate}
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
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <span>Forge Audio</span> <Zap className="w-4 h-4 fill-current" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Center/Right: Generation Workspace */}
      <div className="flex-1 h-full relative overflow-hidden z-10 hidden lg:block">
        <div className="h-full w-full pt-10 flex flex-col items-center justify-center p-8 md:p-12 relative overflow-hidden bg-transparent">
          
          <AnimatePresence mode="wait">
            {/* Generating State */}
            {isGenerating && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-8 relative z-10"
              >
                <div className="relative w-64 h-64 flex items-center justify-center">
                   <div className="absolute inset-0 rounded-[3rem] border border-white/5 bg-white/[0.01] backdrop-blur-xl shadow-2xl overflow-hidden" />
                   <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at center, ${color}, transparent 70%)` }} />
                   <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-[3rem] border"
                      style={{ borderColor: `${color}40`, boxShadow: `0 0 40px ${color}20` }}
                   />
                   <div className="relative z-10 text-white">
                      <MiniWaveform color={color} isPlaying={true} />
                   </div>
                </div>
                
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-black text-white italic tracking-[0.4em] uppercase">Synthesizing Signal <span className="animate-pulse">_</span></h3>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <ActivitySquare className="w-4 h-4 text-zinc-500 animate-pulse" />
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic">Acoustic Rendering Pipeline Active</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Audio Ready State */}
            {!isGenerating && audioUrl && (
              <motion.div
                key="player"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-2xl relative z-10"
              >
                <div className="p-8 rounded-[2rem] border border-white/5 bg-white/[0.01] shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col gap-8 backdrop-blur-xl">
                  
                  {/* Action Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2 italic">Operation Successful</p>
                      <h3 className="text-2xl font-black text-white uppercase tracking-wider">Audio Forged</h3>
                    </div>
                    <a href={audioUrl} download={`audio_${Date.now()}.${isNvidiaRiva ? "wav" : audioFormat}`}
                       className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 hover:scale-105 active:scale-95 transition-all text-white">
                      <Download className="w-5 h-5" />
                    </a>
                  </div>

                  {/* Player area */}
                  <div className="relative p-6 rounded-[1.5rem] bg-zinc-950/50 border border-white/5 shadow-inner overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t to-transparent" style={{ backgroundImage: `linear-gradient(to top, ${color}10, transparent)` }} />
                    <div className="flex items-center gap-6 relative z-10">
                      
                      {/* Play Button */}
                      <button onClick={togglePlay}
                        className="w-16 h-16 rounded-[1.2rem] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group shrink-0 relative overflow-hidden"
                        style={{ backgroundColor: color, color: '#ffffff', boxShadow: `0 10px 20px ${color}30` }}>
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                      </button>
                      
                      <div className="flex-1 flex items-center justify-center h-16">
                         <MiniWaveform color={color} isPlaying={isPlaying} />
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                     <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em] italic">Neural Playback Node</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Empty State */}
            {!isGenerating && !audioUrl && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center justify-center gap-6 relative z-10 opacity-30 cursor-default grayscale"
              >
                <div className="w-24 h-24 rounded-3xl border border-white/10 flex items-center justify-center text-zinc-600 bg-white/[0.01]">
                   {isTTS ? <Mic className="w-10 h-10" /> : <Music className="w-10 h-10" />}
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-black text-zinc-500 uppercase tracking-[0.4em] italic mb-2">Awaiting Parameters</h4>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Ready to Synthesize Signal</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <audio ref={audioRef} src={audioUrl || ""} />
        </div>
      </div>

    </div>
  );
}