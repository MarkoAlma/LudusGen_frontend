import React, { useState, useRef, useEffect } from "react";
import {
  Music, Play, Pause, Download, Loader2, XCircle, Mic,
  Bookmark, History, Volume2, X, Globe,
} from "lucide-react";
import { db } from "../firebase/firebaseApp";
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { DEFAULT_PRESETS } from "./models";

const API_BASE = "http://localhost:3001";

const TTS_VOICES = [
  { id: "alloy",   label: "Alloy",   desc: "Semleges, kiegyensúlyozott" },
  { id: "echo",    label: "Echo",    desc: "Melankolikus, mély" },
  { id: "fable",   label: "Fable",   desc: "Kifejező, brit akcentus" },
  { id: "onyx",    label: "Onyx",    desc: "Mély, tekintélyes" },
  { id: "nova",    label: "Nova",    desc: "Energikus, barátságos" },
  { id: "shimmer", label: "Shimmer", desc: "Lágy, kellemes" },
];

const TTS_FORMATS  = ["mp3", "opus", "aac", "flac"];
const MUSIC_GENRES = ["cinematic orchestral", "lo-fi hip hop", "electronic", "jazz", "ambient", "rock", "classical", "folk", "blues", "pop", "synthwave", "drum and bass"];
const MUSIC_MOODS  = ["epic", "chill", "energetic", "melancholic", "happy", "dark", "romantic", "tense", "peaceful", "mysterious"];

// ── NVIDIA Riva hang + emotion adatok ────────────────────────────
// emotions: [] → nincs emotion selector (csak az alap nevet küldjük az API-nak)
// emotions: ["Neutral", ...] → megjelenik az emotion selector
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
    { name: "Aria",    desc: "Professzionális női",   emotions: ["Neutral","Angry","Calm","Fearful","Happy","Sad"] },
    { name: "Diego",   desc: "Férfi hang",             emotions: [] },
    { name: "Isabela", desc: "Spanyolos akcentus",     emotions: [] },
    { name: "Jason",   desc: "Barátságos, fiatalos",   emotions: ["Neutral","Angry","Calm","Happy"] },
    { name: "Leo",     desc: "Mély, nyugodt",          emotions: ["Neutral","Angry","Calm","Fearful","Sad"] },
    { name: "Louise",  desc: "Professzionális",        emotions: [] },
    { name: "Mia",     desc: "Barátságos, meleg",      emotions: ["Neutral","Angry","Calm","Happy","Sad"] },
    { name: "Pascal",  desc: "Neutrális férfi",        emotions: [] },
    { name: "Ray",     desc: "Energikus férfi",        emotions: ["Neutral","Angry","Calm","Fearful","Happy"] },
    { name: "Sofia",   desc: "Kellemes női",           emotions: ["Neutral","Angry","Calm","Fearful","Happy"] },
  ],
  "ES-US": [
    { name: "Aria",    desc: "Spanyol női",            emotions: [] },
    { name: "Diego",   desc: "Expresszív férfi",       emotions: ["Neutral","Angry","Calm","Disgust","Happy","PleasantSurprise"] },
    { name: "Isabela", desc: "Expresszív női",         emotions: ["Neutral","Angry","Calm","Fearful","Happy","PleasantSurprise","Sad"] },
    { name: "Jason",   desc: "Spanyol férfi",          emotions: [] },
    { name: "Leo",     desc: "Spanyol férfi",          emotions: [] },
    { name: "Louise",  desc: "Spanyol női",            emotions: [] },
    { name: "Mia",     desc: "Spanyol női",            emotions: [] },
    { name: "Pascal",  desc: "Spanyol férfi",          emotions: [] },
    { name: "Ray",     desc: "Spanyol férfi",          emotions: [] },
    { name: "Sofia",   desc: "Spanyol női",            emotions: [] },
  ],
  "FR-FR": [
    { name: "Aria",    desc: "Francia női",            emotions: [] },
    { name: "Diego",   desc: "Francia férfi",          emotions: [] },
    { name: "Isabela", desc: "Francia női",            emotions: [] },
    { name: "Jason",   desc: "Francia férfi",          emotions: [] },
    { name: "Leo",     desc: "Francia férfi",          emotions: [] },
    { name: "Louise",  desc: "Francia női",            emotions: [] },
    { name: "Mia",     desc: "Francia női",            emotions: [] },
    { name: "Pascal",  desc: "Expresszív férfi",       emotions: ["Neutral","Angry","Calm","Disgust","Happy","Sad"] },
    { name: "Ray",     desc: "Francia férfi",          emotions: [] },
    { name: "Sofia",   desc: "Francia női",            emotions: [] },
  ],
  "DE-DE": [
    { name: "Diego",   desc: "Német férfi",            emotions: [] },
    { name: "Mia",     desc: "Német női",              emotions: [] },
    { name: "Pascal",  desc: "Német férfi",            emotions: [] },
    { name: "Sofia",   desc: "Német női",              emotions: [] },
  ],
  "ZH-CN": [
    { name: "Aria",    desc: "Kínai női",              emotions: [] },
    { name: "Diego",   desc: "Kínai férfi",            emotions: [] },
    { name: "HouZhen", desc: "Kínai férfi",            emotions: [] },
    { name: "Isabela", desc: "Kínai női",              emotions: [] },
    { name: "Long",    desc: "Kínai férfi",            emotions: [] },
    { name: "Louise",  desc: "Kínai női",              emotions: [] },
    { name: "Mia",     desc: "Kínai női",              emotions: [] },
    { name: "North",   desc: "Kínai férfi",            emotions: [] },
    { name: "Pascal",  desc: "Kínai férfi",            emotions: [] },
    { name: "Ray",     desc: "Kínai férfi",            emotions: [] },
    { name: "Siwei",   desc: "Kínai női",              emotions: [] },
  ],
  "IT-IT": [
    { name: "Isabela", desc: "Olasz női",              emotions: [] },
    { name: "Pascal",  desc: "Olasz férfi",            emotions: [] },
  ],
  "VI-VN": [
    { name: "Aria",    desc: "Vietnámi női",           emotions: [] },
    { name: "Diego",   desc: "Vietnámi férfi",         emotions: [] },
    { name: "Isabela", desc: "Vietnámi női",           emotions: [] },
    { name: "Jason",   desc: "Vietnámi férfi",         emotions: [] },
    { name: "Le",      desc: "Vietnámi férfi",         emotions: [] },
    { name: "Long",    desc: "Expresszív férfi",       emotions: ["Neutral","Angry","Calm","Disgust","Fearful","Happy","Sad"] },
    { name: "Louise",  desc: "Vietnámi női",           emotions: [] },
    { name: "Mia",     desc: "Vietnámi női",           emotions: [] },
    { name: "North",   desc: "Vietnámi férfi",         emotions: [] },
    { name: "Pascal",  desc: "Vietnámi férfi",         emotions: [] },
    { name: "Ray",     desc: "Vietnámi férfi",         emotions: [] },
    { name: "Sofia",   desc: "Vietnámi női",           emotions: [] },
  ],
};

const EMOTION_EMOJI = {
  Neutral:          "😐",
  Angry:            "😠",
  Calm:             "😌",
  Happy:            "😊",
  Sad:              "😢",
  Fearful:          "😨",
  Disgust:          "🤢",
  PleasantSurprise: "😲",
};

const MiniWaveform = ({ color }) => (
  <div className="flex items-center gap-0.5 h-5">
    {Array.from({ length: 20 }).map((_, i) => (
      <div key={i} className="w-0.5 rounded-full animate-pulse"
        style={{
          height: `${Math.sin(i * 0.8) * 50 + 60}%`,
          background: color,
          animationDelay: `${i * 0.05}s`,
          opacity: 0.7 + (i % 3) * 0.1,
        }}
      />
    ))}
  </div>
);

export default function AudioPanel({ selectedModel, userId, getIdToken }) {
  const isTTS        = selectedModel.audioType === "tts";
  const isNvidiaRiva = selectedModel.provider === "nvidia-riva";

  const [activeTab, setActiveTab] = useState("generate");

  // OpenAI / ElevenLabs
  const [text, setText]                   = useState("");
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [speed, setSpeed]                 = useState(1.0);
  const [audioFormat, setAudioFormat]     = useState("mp3");

  // NVIDIA Riva
  const [rivaLang, setRivaLang]           = useState("EN-US");
  const [rivaVoiceName, setRivaVoiceName] = useState("Aria");
  const [rivaEmotion, setRivaEmotion]     = useState("Neutral");

  const rivaVoices   = RIVA_VOICES[rivaLang] || [];
  const rivaVoiceObj = rivaVoices.find((v) => v.name === rivaVoiceName) || rivaVoices[0];
  const hasEmotions  = (rivaVoiceObj?.emotions?.length || 0) > 0;

  // Nyelvváltáskor: első elérhető hang + első emotion
  useEffect(() => {
    const first = (RIVA_VOICES[rivaLang] || [])[0];
    if (first) {
      setRivaVoiceName(first.name);
      setRivaEmotion(first.emotions[0] || "");
    }
  }, [rivaLang]);

  // Hangváltáskor: emotion reset
  useEffect(() => {
    if (rivaVoiceObj) setRivaEmotion(rivaVoiceObj.emotions[0] || "");
  }, [rivaVoiceName]);

  // Az API-nak küldött teljes voice_name
  // pl. "Magpie-Multilingual.EN-US.Aria.Happy" vagy "Magpie-Multilingual.EN-US.Diego"
  const buildRivaVoiceName = () => {
    const base = `Magpie-Multilingual.${rivaLang}.${rivaVoiceName}`;
    return hasEmotions && rivaEmotion ? `${base}.${rivaEmotion}` : base;
  };

  // Music
  const [musicPrompt, setMusicPrompt]   = useState("");
  const [genre, setGenre]               = useState("");
  const [mood, setMood]                 = useState("");
  const [duration, setDuration]         = useState(30);
  const [instrumental, setInstrumental] = useState(true);

  // Common
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl]         = useState(null);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [error, setError]               = useState(null);
  const [history, setHistory]           = useState([]);
  const [presets, setPresets]           = useState(
    DEFAULT_PRESETS.audio.filter((p) =>
      isTTS ? ["audio_natural","audio_dramatic"].includes(p.id)
             : ["music_cinematic","music_lofi"].includes(p.id)
    )
  );
  const [activePresetId, setActivePresetId] = useState(isTTS ? "audio_natural" : "music_cinematic");
  const [presetSaveOpen, setPresetSaveOpen] = useState(false);
  const [newPresetName, setNewPresetName]   = useState("");

  const audioRef = useRef(null);
  const color    = selectedModel.color;

  useEffect(() => { loadHistory(); }, [userId, selectedModel.id]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.onended = () => setIsPlaying(false);
  }, [audioUrl]);

  const loadHistory = async () => {
    if (!userId) return;
    try {
      const ref  = collection(db, "audio_generations", userId, selectedModel.id);
      const q    = query(ref, orderBy("createdAt", "desc"), limit(20));
      const snap = await getDocs(q);
      setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {}
  };

  const applyPreset = (preset) => {
    if (preset.speed    !== undefined) setSpeed(preset.speed);
    if (preset.genre)    setGenre(preset.genre);
    if (preset.mood)     setMood(preset.mood);
    if (preset.duration) setDuration(preset.duration);
    setActivePresetId(preset.id);
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else           { audioRef.current.play();  setIsPlaying(true);  }
  };

  const handleGenerate = async () => {
    const content = isTTS ? text : musicPrompt;
    if (!content.trim()) return;
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    setIsPlaying(false);

    try {
      const token    = getIdToken ? await getIdToken() : null;
      const endpoint = isTTS ? `${API_BASE}/api/generate-tts` : `${API_BASE}/api/generate-music`;

      let body;
      if (isTTS) {
        if (isNvidiaRiva) {
          // language_code: "EN-US" → "en-US"
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

      const res  = await fetch(endpoint, {
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
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-2 flex-shrink-0">
        {[
          { id: "generate", label: isTTS ? "🎙️ TTS" : "🎵 Zene" },
          { id: "presets",  label: `📌 Presetek (${presets.length})` },
          { id: "history",  label: `📂 Előzmények (${history.length})` },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="cursor-pointer px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-90 active:scale-95"
            style={{
              background: activeTab === tab.id ? `${color}20` : "transparent",
              color:      activeTab === tab.id ? "white" : "#6b7280",
              border:     activeTab === tab.id ? `1px solid ${color}40` : "1px solid transparent",
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* ── GENERATE TAB ── */}
      {activeTab === "generate" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">

          {isTTS ? (
            <>
              {/* Szöveg input */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Szöveg *</label>
                  <span className="text-gray-600 text-xs">{text.length} kar</span>
                </div>
                <textarea value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Írd be a felolvasandó szöveget..." rows={5}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-gray-600 resize-none focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${text ? color + "40" : "rgba(255,255,255,0.09)"}` }}
                />
              </div>

              {isNvidiaRiva ? (
                <>
                  {/* ── Nyelv ── */}
                  <div>
                    <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Globe className="w-3 h-3" /> Nyelv
                    </label>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {RIVA_LANGUAGES.map((lang) => (
                        <button key={lang.code} onClick={() => setRivaLang(lang.code)}
                          className="cursor-pointer px-2.5 py-1 rounded-full text-xs transition-all hover:opacity-90 active:scale-95"
                          style={{
                            background: rivaLang === lang.code ? `${color}25` : "rgba(255,255,255,0.04)",
                            border:     rivaLang === lang.code ? `1px solid ${color}55` : "1px solid rgba(255,255,255,0.08)",
                            color:      rivaLang === lang.code ? "white" : "#6b7280",
                            transform:  rivaLang === lang.code ? "scale(1.05)" : "scale(1)",
                          }}
                        >{lang.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* ── Hang ── */}
                  <div>
                    <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Hang</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {rivaVoices.map((voice) => {
                        const active = rivaVoiceName === voice.name;
                        return (
                          <button key={voice.name} onClick={() => setRivaVoiceName(voice.name)}
                            className="cursor-pointer p-2.5 rounded-xl text-left transition-all hover:opacity-90 active:scale-95"
                            style={{
                              background: active ? `${color}20` : "rgba(255,255,255,0.03)",
                              border:     active ? `1.5px solid ${color}55` : "1px solid rgba(255,255,255,0.07)",
                              transform:  active ? "scale(1.02)" : "scale(1)",
                            }}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Volume2 className="w-3 h-3" style={{ color: active ? color : "#6b7280" }} />
                              <span className="text-white text-xs font-semibold">{voice.name}</span>
                              {voice.emotions.length > 0 && (
                                <span className="text-xs px-1 rounded-full" style={{ background: `${color}20`, color }}>✨</span>
                              )}
                            </div>
                            <p className="text-gray-500 text-xs">{voice.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Emotion (csak ha a hangnak van) ── */}
                  {hasEmotions && (
                    <div>
                      <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                        Érzelem — <span style={{ color }}>{rivaVoiceName}</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {rivaVoiceObj.emotions.map((em) => (
                          <button key={em} onClick={() => setRivaEmotion(em)}
                            className="cursor-pointer px-3 py-1.5 rounded-full text-xs transition-all hover:opacity-90 active:scale-95 flex items-center gap-1"
                            style={{
                              background: rivaEmotion === em ? `${color}25` : "rgba(255,255,255,0.04)",
                              border:     rivaEmotion === em ? `1px solid ${color}55` : "1px solid rgba(255,255,255,0.08)",
                              color:      rivaEmotion === em ? "white" : "#6b7280",
                              transform:  rivaEmotion === em ? "scale(1.04)" : "scale(1)",
                            }}>
                            <span>{EMOTION_EMOJI[em] || "🎭"}</span>
                            <span>{em}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

              
                </>
              ) : (
                <>
                  {/* OpenAI voice selector */}
                  <div>
                    <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Hang kiválasztása</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {TTS_VOICES.map((voice) => (
                        <button key={voice.id} onClick={() => setSelectedVoice(voice.id)}
                          className="cursor-pointer p-2.5 rounded-xl text-left transition-all hover:opacity-90 active:scale-95"
                          style={{
                            background: selectedVoice === voice.id ? `${color}20` : "rgba(255,255,255,0.03)",
                            border:     selectedVoice === voice.id ? `1.5px solid ${color}55` : "1px solid rgba(255,255,255,0.07)",
                            transform:  selectedVoice === voice.id ? "scale(1.02)" : "scale(1)",
                          }}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Volume2 className="w-3 h-3" style={{ color: selectedVoice === voice.id ? color : "#6b7280" }} />
                            <span className="text-white text-xs font-semibold">{voice.label}</span>
                          </div>
                          <p className="text-gray-500 text-xs">{voice.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Speed */}
                  <div className="p-4 rounded-xl space-y-2"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex justify-between">
                      <span className="text-white text-sm font-semibold">Sebesség</span>
                      <span className="font-bold" style={{ color }}>{speed}×</span>
                    </div>
                    <input type="range" min={0.25} max={4} step={0.05} value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-full cursor-pointer" style={{ accentColor: color }} />
                    <p className="text-gray-600 text-xs">0.25 = lassú · 1.0 = normál · 4.0 = gyors</p>
                  </div>

                  {/* Format */}
                  <div>
                    <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Formátum</label>
                    <div className="flex gap-2">
                      {TTS_FORMATS.map((fmt) => (
                        <button key={fmt} onClick={() => setAudioFormat(fmt)}
                          className="cursor-pointer flex-1 py-2 rounded-xl text-xs font-semibold uppercase transition-all"
                          style={{
                            background: audioFormat === fmt ? `${color}25` : "rgba(255,255,255,0.04)",
                            border:     audioFormat === fmt ? `1px solid ${color}50` : "1px solid rgba(255,255,255,0.08)",
                            color:      audioFormat === fmt ? "white" : "#6b7280",
                          }}>{fmt}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Music form */}
              <div>
                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Zenei leírás *</label>
                <textarea value={musicPrompt} onChange={(e) => setMusicPrompt(e.target.value)}
                  placeholder="Írd le a zenét..." rows={4}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-gray-600 resize-none focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${musicPrompt ? color + "40" : "rgba(255,255,255,0.09)"}` }}
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Műfaj</label>
                <div className="flex flex-wrap gap-1.5">
                  {MUSIC_GENRES.map((g) => (
                    <button key={g} onClick={() => setGenre(genre === g ? "" : g)}
                      className="cursor-pointer px-2.5 py-1 rounded-full text-xs transition-all"
                      style={{
                        background: genre === g ? `${color}25` : "rgba(255,255,255,0.04)",
                        border:     genre === g ? `1px solid ${color}55` : "1px solid rgba(255,255,255,0.08)",
                        color:      genre === g ? "white" : "#6b7280",
                      }}>{g}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Hangulat</label>
                <div className="flex flex-wrap gap-1.5">
                  {MUSIC_MOODS.map((m) => (
                    <button key={m} onClick={() => setMood(mood === m ? "" : m)}
                      className="cursor-pointer px-2.5 py-1 rounded-full text-xs transition-all"
                      style={{
                        background: mood === m ? `${color}25` : "rgba(255,255,255,0.04)",
                        border:     mood === m ? `1px solid ${color}55` : "1px solid rgba(255,255,255,0.08)",
                        color:      mood === m ? "white" : "#6b7280",
                      }}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex justify-between mb-1">
                    <span className="text-white text-sm font-semibold">Hossz</span>
                    <span className="font-bold" style={{ color }}>{duration}s</span>
                  </div>
                  <input type="range" min={5} max={90} step={5} value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full cursor-pointer" style={{ accentColor: color }} />
                </div>
                <div className="p-3 rounded-xl flex flex-col justify-between"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-white text-sm font-semibold">Ének nélkül</span>
                  <button onClick={() => setInstrumental(!instrumental)}
                    className="cursor-pointer w-12 h-6 rounded-full transition-all relative"
                    style={{ background: instrumental ? color : "rgba(255,255,255,0.1)" }}>
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: instrumental ? "calc(100% - 20px)" : "4px" }} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Audio player */}
          {audioUrl && (
            <div className="p-4 rounded-2xl" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
              <div className="flex items-center gap-3">
                <button onClick={togglePlay}
                  className="cursor-pointer w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                  style={{ background: color }}>
                  {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                </button>
                <div className="flex-1"><MiniWaveform color={color} /></div>
                <audio ref={audioRef} src={audioUrl} />
                <a href={audioUrl} download={`audio_${Date.now()}.${isNvidiaRiva ? "wav" : audioFormat}`}
                  className="cursor-pointer p-2 rounded-lg text-white hover:opacity-80 transition-all"
                  style={{ background: "rgba(255,255,255,0.1)" }}>
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Generate gomb */}
          <button onClick={handleGenerate}
            disabled={!(isTTS ? text : musicPrompt).trim() || isGenerating}
            className="cursor-pointer w-full py-4 rounded-2xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed"
            style={{
              background: (isTTS ? text : musicPrompt).trim() && !isGenerating
                ? `linear-gradient(135deg, ${color}, ${color}88)` : "rgba(255,255,255,0.05)",
              opacity:   (isTTS ? text : musicPrompt).trim() && !isGenerating ? 1 : 0.4,
              boxShadow: (isTTS ? text : musicPrompt).trim() && !isGenerating ? `0 0 30px ${color}30` : "none",
            }}>
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isTTS ? "Hangszintézis..." : "Zene generálása..."}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {isTTS ? <Mic className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                {isTTS ? "Hang generálása" : "Zene generálása"}
              </span>
            )}
          </button>

          {/* Preset mentés */}
          {!presetSaveOpen ? (
            <button onClick={() => setPresetSaveOpen(true)}
              className="cursor-pointer w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Bookmark className="w-3.5 h-3.5" /> Beállítások mentése presetként
            </button>
          ) : (
            <div className="flex gap-2">
              <input value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset neve..."
                className="flex-1 px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${color}40` }}
                autoFocus onKeyDown={(e) => e.key === "Enter" && savePreset()} />
              <button onClick={savePreset}
                className="cursor-pointer px-4 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>Ment</button>
              <button onClick={() => setPresetSaveOpen(false)}
                className="cursor-pointer p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PRESETS TAB ── */}
      {activeTab === "presets" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin">
          {presets.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <div key={preset.id} className="p-3 rounded-xl transition-all"
                style={{
                  background: isActive ? `${color}15` : "rgba(255,255,255,0.02)",
                  border:     isActive ? `1px solid ${color}40` : "1px solid rgba(255,255,255,0.07)",
                }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-semibold text-sm">{preset.name}</span>
                    <div className="flex gap-2 mt-1 text-xs text-gray-600">
                      {preset.speed    && <span>Sebesség: {preset.speed}×</span>}
                      {preset.genre    && <span>{preset.genre}</span>}
                      {preset.mood     && <span>{preset.mood}</span>}
                      {preset.duration && <span>{preset.duration}s</span>}
                    </div>
                  </div>
                  <button onClick={() => applyPreset(preset)}
                    className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: isActive ? `${color}25` : "rgba(255,255,255,0.06)", color: isActive ? color : "#9ca3af" }}>
                    {isActive ? "✓ Aktív" : "Alkalmaz"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === "history" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <History className="w-10 h-10 text-gray-700" />
              <p className="text-gray-500 text-sm">Még nincs hangfelvétel</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.id}
                  className="cursor-pointer p-3 rounded-xl transition-all hover:bg-white/5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  onClick={() => {
                    setAudioUrl(item.audioUrl);
                    if (item.text)      setText(item.text);
                    if (item.prompt)    setMusicPrompt(item.prompt);
                    if (item.lang)      setRivaLang(item.lang);
                    if (item.voiceName) setRivaVoiceName(item.voiceName);
                    if (item.emotion)   setRivaEmotion(item.emotion);
                  }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}30` }}>
                      {item.type === "tts"
                        ? <Mic className="w-3.5 h-3.5" style={{ color }} />
                        : <Music className="w-3.5 h-3.5" style={{ color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{item.text || item.prompt || "—"}</p>
                      <p className="text-gray-600 text-xs">
                        {item.voiceName || item.voice || item.genre || ""}
                        {item.emotion ? ` · ${EMOTION_EMOJI[item.emotion] || ""} ${item.emotion}` : ""}
                        {item.lang ? ` · ${item.lang}` : ""}
                        {item.duration ? ` · ${item.duration}s` : ""}
                      </p>
                    </div>
                    {item.audioUrl && (
                      <a href={item.audioUrl} download
                        className="cursor-pointer p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/10"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                        onClick={(e) => e.stopPropagation()}>
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}