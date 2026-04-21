import React, { useState, useRef, useEffect } from "react";
import { useJobs } from '../context/JobsContext';
import toast from "react-hot-toast";
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
import AudioControls from '../components/audio_studio/AudioControls';
import AudioWorkspace from '../components/audio_studio/AudioWorkspace';

import { API_BASE } from "../api/client";

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
  { code: "EN-US", label: "English" },
  { code: "ES-US", label: "Spanish" },
  { code: "FR-FR", label: "French" },
  { code: "DE-DE", label: "German" },
  { code: "ZH-CN", label: "Mandarin" },
  { code: "IT-IT", label: "Italian" },
  { code: "VI-VN", label: "Vietnamese" },
  { code: "HI-IN", label: "Hindi" },
  { code: "JA-JP", label: "Japanese" },
];

const RIVA_VOICES = {
  "EN-US": [
    { name: "Aria", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Diego", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "Isabela", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Jason", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Happy"] },
    { name: "Leo", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Sad"] },
    { name: "Louise", desc: "Női hang", emotions: [] },
    { name: "Mia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Ray", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Sofia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
  ],
  "ES-US": [
    { name: "Aria", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Diego", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "Isabela", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Jason", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Happy"] },
    { name: "Leo", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Sad"] },
    { name: "Louise", desc: "Női hang", emotions: [] },
    { name: "Mia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Ray", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Sofia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
  ],
  "FR-FR": [
    { name: "Aria", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Diego", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "Isabela", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Jason", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Happy"] },
    { name: "Leo", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Sad"] },
    { name: "Louise", desc: "Női hang", emotions: [] },
    { name: "Mia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Ray", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Sofia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
  ],
  "DE-DE": [
    { name: "Diego", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "Mia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Sofia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
  ],
  "ZH-CN": [
    { name: "Aria", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Diego", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "HouZhen", desc: "Férfi hang", emotions: [] },
    { name: "Isabela", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Long", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgusted", "Fearful", "Happy", "Sad"] },
    { name: "Louise", desc: "Női hang", emotions: [] },
    { name: "Mia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Ray", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Siwei", desc: "Női hang", emotions: [] },
  ],
  "IT-IT": [
    { name: "Isabela", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Pascal", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
  ],
  "VI-VN": [
    { name: "Aria", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Jason", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Happy"] },
    { name: "Leo", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Sad"] },
    { name: "Long", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgusted", "Fearful", "Happy", "Sad"] },
    { name: "Mia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Phung", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Disgusted", "Fearful", "Happy", "Sad"] },
    { name: "Ray", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Sofia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
  ],
  "HI-IN": [
    { name: "Aria", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Diego", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "HouZhen", desc: "Férfi hang", emotions: [] },
    { name: "Isabela", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Jason", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Happy"] },
    { name: "Leo", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Sad"] },
    { name: "Long", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgusted", "Fearful", "Happy", "Sad"] },
    { name: "Mia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Phung", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Disgusted", "Fearful", "Happy", "Sad"] },
    { name: "Ray", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Siwei", desc: "Női hang", emotions: [] },
    { name: "Sofia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
  ],
  "JA-JP": [
    { name: "Aria", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Diego", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "HouZhen", desc: "Férfi hang", emotions: [] },
    { name: "Isabela", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Jason", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Happy"] },
    { name: "Long", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgusted", "Fearful", "Happy", "Sad"] },
    { name: "Louise", desc: "Női hang", emotions: [] },
    { name: "Mia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Ray", desc: "Férfi hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Siwei", desc: "Női hang", emotions: [] },
    { name: "Sofia", desc: "Női hang", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
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
  Disgusted: "🤢",
  PleasantSurprised: "😲",
};

const EMOTION_LABELS = {
  Neutral: "Semleges",
  Angry: "Mérges",
  Calm: "Nyugodt",
  Happy: "Vidám",
  Sad: "Szomorú",
  Fearful: "Félő",
  Disgust: "Undorodó",
  Disgusted: "Undorodó",
  PleasantSurprised: "Meglepett",
};


export default function AudioPanel({ selectedModel, userId, getIdToken, isGlobalOpen, toggleGlobalSidebar, globalSidebar }) {
  const { jobs, addJob, updateJob, markJobDone, markJobDoneAndSeen, markJobError } = useJobs();
  const [currentJobId, setCurrentJobId] = useState(null);
  const startJob = (kind, title, targetTab) => {
    const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    addJob({ id, kind, panelType: 'audio', modelId: selectedModel.id, title, status: 'running', progress: 0, createdAt: Date.now(), updatedAt: Date.now(), errorMessage: null, completedAt: null, seenAt: null, targetTab });
    return id;
  };

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
  const [view, setView] = useState("forge");

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

  // Sync with global jobs for cancellation
  useEffect(() => {
    if (!currentJobId || !isGenerating) return;
    const stillExists = jobs.some(j => j.id === currentJobId);
    if (!stillExists) {
      if (generationController.current) {
        generationController.current.abort();
        generationController.current = null;
      }
      setIsGenerating(false);
      setCurrentJobId(null);
    }
  }, [jobs, currentJobId, isGenerating]);

  const [leftSecondaryOpen, setLeftSecondaryOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [offsets, setOffsets] = useState({ left: 320, right: 0 });

  const audioRef = useRef(null);
  const generationController = useRef(null);
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
    const jobId = startJob(isTTS ? 'audio' : 'music', (content || 'Hanggenerálás').slice(0, 48), 'audio');
    setCurrentJobId(jobId);
    generationController.current = new AbortController();

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
            jobId,
          };
        } else {
          body = { model: selectedModel.apiModel, provider: selectedModel.provider, text, voice: selectedVoice, speed, format: audioFormat, jobId };
        }
      } else {
        body = { apiId: selectedModel.apiId, prompt: musicPrompt, genre, mood, duration, instrumental, jobId };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
        signal: generationController.current?.signal,
      });
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const j = await res.json(); errMsg = j.message || errMsg; } catch {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      if (generationController.current?.signal.aborted) return;
      if (!data.success) throw new Error(data.message);

      setAudioUrl(data.audioUrl);
      markJobDoneAndSeen(jobId, { progress: 100, updatedAt: Date.now(), completedAt: Date.now() });

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
      markJobError(jobId, err.message || 'Generálási hiba');
    } finally {
      setIsGenerating(false);
    }
  };

  const Select = ({ label, options, value, onChange }) => (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase text-zinc-600">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-2 text-[11px] text-zinc-200 focus:outline-none">
        <option value="">Válassz: {label}</option>
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
      leftSecondaryWidth={view === 'history' ? 72 : 392}
      onOffsetChange={setOffsets}
      leftSidebar={globalSidebar}
      leftSecondarySidebar={
        <div className="h-full flex flex-row overflow-hidden bg-[#060410]/60 backdrop-blur-3xl border-r border-white/5">
          {/* Tool Strip (72px) */}
          <div className="w-[72px] h-full flex flex-col items-center pt-6 space-y-3 border-r border-white/5 bg-[#030308]">
            {[
              {
                id: 'forge',
                label: 'ALKOTÁS',
                icon: <Zap className="w-5 h-5" />,
                isActive: view === 'forge',
                onClick: () => { setView('forge'); setLeftSecondaryOpen(true); },
              },
              {
                id: 'history',
                label: 'ARCHÍVUM',
                icon: <History className="w-5 h-5" />,
                isActive: view === 'history',
                onClick: () => setView('history'),
              },
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={tool.onClick}
                title={tool.label}
                className="group flex flex-col items-center gap-1.5 transition-all duration-300 border-none bg-transparent cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border ${tool.isActive
                      ? 'bg-white/5 border-white/10 shadow-xl'
                      : 'bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/5'
                    }`}
                  style={tool.isActive ? { borderColor: `${color}40`, color } : { color: '#52525b' }}
                >
                  {tool.icon}
                </div>
                <span className={`text-[8px] font-black tracking-[0.2em] transition-all duration-500 ${tool.isActive ? 'text-white' : 'text-zinc-700 group-hover:text-zinc-500'
                  }`}>
                  {tool.label}
                </span>
              </button>
            ))}
            <div className="flex-1" />
          </div>

          <div className="flex-1 h-full overflow-hidden">
            {view !== 'history' && (
              <AudioControls
                selectedModel={selectedModel}
                onModelChange={(m) => { setAudioUrl(null); setIsPlaying(false); }} // Note: in real use this might be handled via parent
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
                text={text} setText={setText}
                selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice}
                speed={speed} setSpeed={setSpeed}
                rivaLang={rivaLang} setRivaLang={setRivaLang}
                rivaVoices={rivaVoices}
                rivaVoiceName={rivaVoiceName} setRivaVoiceName={setRivaVoiceName}
                rivaEmotion={rivaEmotion} setRivaEmotion={setRivaEmotion}
                hasEmotions={hasEmotions}
                musicPrompt={musicPrompt} setMusicPrompt={setMusicPrompt}
                genre={genre} setGenre={setGenre}
                mood={mood} setMood={setMood}
                duration={duration} setDuration={setDuration}
                instrumental={instrumental} setInstrumental={setInstrumental}
              />
            )}
          </div>
        </div>
      }
    >
      <div className="h-full w-full relative overflow-hidden flex flex-col">
        <BackgroundFilters />
        
        {/* Existing Background Logic - Preserved as requested */}
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

        <AudioWorkspace 
          view={view}
          isGenerating={isGenerating}
          audioUrl={audioUrl}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          color={color}
          history={history}
          onHistorySelect={(item) => {
            setAudioUrl(item.audioUrl);
            setView('forge');
            setIsPlaying(false);
          }}
        />
        {audioUrl && <audio ref={audioRef} src={audioUrl} />}
      </div>
    </StudioLayout>
  );
}
