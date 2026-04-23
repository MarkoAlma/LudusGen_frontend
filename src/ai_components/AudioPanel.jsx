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

import BackgroundFilters from '../components/chat/BackgroundFilters';
import AudioEngineBg from '../assets/backgrounds/motif_audio_bg.png';
import StudioLayout from '../components/shared/StudioLayout';
import { useStudioPanels } from '../context/StudioPanelContext';
import AudioControls from '../components/audio_studio/AudioControls';
import AudioWorkspace from '../components/audio_studio/AudioWorkspace';

import { API_BASE, enhancePrompt } from "../api/client";

const TTS_VOICES = [
  { id: "alloy", label: "Alloy", desc: "Semleges, kiegyensúlyozott" },
  { id: "echo", label: "Echo", desc: "Melankolikus, mély" },
  { id: "fable", label: "Fable", desc: "Kifejező, brit akcentus" },
  { id: "onyx", label: "Onyx", desc: "Mély, tekintélyes" },
  { id: "nova", label: "Nova", desc: "Energikus, barátságos" },
  { id: "shimmer", label: "Shimmer", desc: "Lágy, kellemes" },
];

const TTS_FORMATS = ["mp3", "opus", "aac", "flac"];

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

const DEAPI_REFERENCE_AUDIO_MAX_BYTES = 10 * 1024 * 1024;
const DEAPI_REFERENCE_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "video/mp4",
]);
const DEAPI_REFERENCE_AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".flac", ".ogg", ".m4a"]);
const DEAPI_MUSIC_ENHANCER_PROMPT = `
You are a music prompt enhancer for deAPI txt2music models.
Your job is to transform a short user music idea into a structured control object for music generation.

Return ONLY a valid JSON object with exactly these keys:
{
  "prompt": "string",
  "bpm": 120,
  "keyscale": "D minor",
  "duration": 90,
  "timesignature": 2 | 3 | 4 | 6 | null,
  "lyrics_mode": "auto-lyrics" | "lyrics" | "instrumental"
}

Rules:
- Stay faithful to the user's core idea.
- Rewrite the prompt in English as a clear, generation-ready music description.
- Enrich the prompt with genre, mood, instrumentation, arrangement, production feel, and vocal feel when relevant.
- Never write actual lyrics text.
- Prefer "auto-lyrics" when vocals are appropriate but no custom user-written lyrics are provided.
- Use "lyrics" only when the user should write their own lyrics manually.
- Use "instrumental" only for no-vocal tracks.
- Always return concrete values for "bpm", "keyscale", and "duration".
- "timesignature" may be null when auto is the best choice.
- Respect any limits provided by the user message.
- Do not add markdown, explanations, comments, or extra keys.
`.trim();
const DEAPI_AUTO_LYRICS_PROMPT = `
You are a songwriting assistant for deAPI ACE-Step music generation.
Write original, singable song lyrics that match the user's music brief.

Output rules:
- Return ONLY the lyrics text.
- No explanations, no markdown fences, no notes.
- Use section labels like [Verse 1], [Pre-Chorus], [Chorus], [Bridge], [Outro] when useful.
- Never output [Instrumental].
- Keep the structure suitable for the requested duration.
- If a vocal language is provided, write in that language. Otherwise infer the best fit from the music brief.
- Make the lyrics performance-ready and stylistically coherent with the genre, mood, and production feel.
- Do not reference copyrighted songs or reuse famous lyrics.
`.trim();
const DEAPI_MUSIC_DEFAULTS = {
  modelSlug: "AceStep_1_5_Base",
  lyricsMode: "",
  lyrics: "",
  duration: "60",
  inferenceSteps: "60",
  guidanceScale: "9",
  seed: -1,
  format: "flac",
  bpm: "",
  keyscale: "",
  timesignature: "",
  vocalLanguage: "unknown",
  webhookUrl: "",
};

const getFileExtension = (filename = "") => {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : "";
};

const readAudioDuration = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement("audio");

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.removeAttribute("src");
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number(audio.duration);
      cleanup();
      resolve(Number.isFinite(duration) ? duration : null);
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("A referencia audio metadata nem olvashato be"));
    };
    audio.src = objectUrl;
  });

const extractEnhancerJson = (raw = "") => {
  const cleaned = String(raw || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new Error("Az AI valasza nem ervenyes JSON.");
  }

  return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
};

const unwrapAiText = (raw = "") =>
  String(raw || "")
    .replace(/^```(?:json|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const trimTextToMaxLength = (text, maxLength) => {
  const value = String(text || "").trim();
  if (value.length <= maxLength) return value;

  const slice = value.slice(0, maxLength);
  const lastSafeBreak = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf(","), slice.lastIndexOf("\n"));
  return (lastSafeBreak > Math.floor(maxLength * 0.65) ? slice.slice(0, lastSafeBreak) : slice).trim();
};

const clampEnhancerNumber = (value, min, max, { integer = false } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;

  let nextValue = parsed;
  if (Number.isFinite(min)) nextValue = Math.max(nextValue, min);
  if (Number.isFinite(max)) nextValue = Math.min(nextValue, max);

  return integer ? Math.round(nextValue) : nextValue;
};

const normalizeEnhancerLyricsMode = (payload) => {
  const explicitMode = String(payload?.lyrics_mode || "").trim().toLowerCase();
  if (["auto-lyrics", "auto_lyrics", "autolyrics", "auto", "generated-lyrics"].includes(explicitMode)) return "auto-lyrics";
  if (["instrumental", "instrument", "no_vocals", "no-vocals"].includes(explicitMode)) return "instrumental";
  if (["lyrics", "vocal", "vocals", "sung"].includes(explicitMode)) return "lyrics";

  if (typeof payload?.instrumental === "boolean") {
    return payload.instrumental ? "instrumental" : "lyrics";
  }

  return null;
};

const normalizeEnhancerTimeSignature = (value) => {
  if (value === null || value === undefined) return "";

  const normalized = String(value).trim().toLowerCase();
  if (!normalized || normalized === "auto" || normalized === "null") return "";

  return ["2", "3", "4", "6"].includes(normalized) ? normalized : "";
};


export default function AudioPanel({ selectedModel, onModelChange, userId, getIdToken, isGlobalOpen, toggleGlobalSidebar, globalSidebar }) {
  const { jobs, addJob, updateJob, markJobDone, markJobDoneAndSeen, markJobError } = useJobs();
  const [currentJobId, setCurrentJobId] = useState(null);
  const startJob = (kind, title, targetTab) => {
    const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    addJob({ id, kind, panelType: 'audio', modelId: selectedModel.id, title, status: 'running', progress: 0, createdAt: Date.now(), updatedAt: Date.now(), errorMessage: null, completedAt: null, seenAt: null, targetTab });
    return id;
  };

  const { registerPanel, unregisterPanel, isMobile, isTablet, setPanelOpen, setPanelsOpen, mobileActive, panelState } = useStudioPanels();

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
  const isDeapiMusic = selectedModel.audioType === "music" && selectedModel.provider === "deapi";

  const [activeTab, setActiveTab] = useState("generate");
  const [view, setView] = useState("forge");

  const closeMobileStudioPanel = () => {
    if (isMobile) {
      setPanelOpen('L2', false);
    }
  };

  const closeNarrowStudioPanel = () => {
    if (isMobile || isTablet) {
      setPanelsOpen({ L1: false, L2: false });
    }
  };

  const isNarrowL2Visible = isMobile
    ? mobileActive === 'L2' && panelState.L2
    : isTablet
      ? panelState.L2
      : false;
  const prevNarrowL2VisibleRef = useRef(isNarrowL2Visible);

  useEffect(() => {
    const wasVisible = prevNarrowL2VisibleRef.current;

    // Mobile keeps the legacy reset-to-forge behavior when reopening L2,
    // but tablet should preserve the current archive view.
    if (isMobile && !wasVisible && isNarrowL2Visible && view === 'history') {
      setView('forge');
    }

    prevNarrowL2VisibleRef.current = isNarrowL2Visible;
  }, [isMobile, isNarrowL2Visible, view]);

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
  const [musicLyrics, setMusicLyrics] = useState("");
  const [musicLyricsOptimizer, setMusicLyricsOptimizer] = useState(false);
  const [musicInstrumental, setMusicInstrumental] = useState(false);
  const [musicStream, setMusicStream] = useState(false);
  const [musicOutputFormat, setMusicOutputFormat] = useState("url");
  const [musicSampleRate, setMusicSampleRate] = useState(44100);
  const [musicBitrate, setMusicBitrate] = useState(256000);
  const [musicFileFormat, setMusicFileFormat] = useState("mp3");

  // deAPI Music
  const [deapiModels, setDeapiModels] = useState([]);
  const [deapiModelsLoading, setDeapiModelsLoading] = useState(false);
  const [deapiModelsError, setDeapiModelsError] = useState("");
  const [deapiModelSlug, setDeapiModelSlug] = useState(DEAPI_MUSIC_DEFAULTS.modelSlug);
  const [deapiCaption, setDeapiCaption] = useState("");
  const [deapiLyricsMode, setDeapiLyricsMode] = useState(DEAPI_MUSIC_DEFAULTS.lyricsMode);
  const [deapiLyrics, setDeapiLyrics] = useState(DEAPI_MUSIC_DEFAULTS.lyrics);
  const [deapiDuration, setDeapiDuration] = useState(DEAPI_MUSIC_DEFAULTS.duration);
  const [deapiInferenceSteps, setDeapiInferenceSteps] = useState(DEAPI_MUSIC_DEFAULTS.inferenceSteps);
  const [deapiGuidanceScale, setDeapiGuidanceScale] = useState(DEAPI_MUSIC_DEFAULTS.guidanceScale);
  const [deapiSeed, setDeapiSeed] = useState(DEAPI_MUSIC_DEFAULTS.seed);
  const [deapiFormat, setDeapiFormat] = useState(DEAPI_MUSIC_DEFAULTS.format);
  const [deapiBpm, setDeapiBpm] = useState(DEAPI_MUSIC_DEFAULTS.bpm);
  const [deapiKeyscale, setDeapiKeyscale] = useState(DEAPI_MUSIC_DEFAULTS.keyscale);
  const [deapiTimesignature, setDeapiTimesignature] = useState(DEAPI_MUSIC_DEFAULTS.timesignature);
  const [deapiVocalLanguage, setDeapiVocalLanguage] = useState(DEAPI_MUSIC_DEFAULTS.vocalLanguage);
  const [deapiWebhookUrl, setDeapiWebhookUrl] = useState(DEAPI_MUSIC_DEFAULTS.webhookUrl);
  const [deapiReferenceAudio, setDeapiReferenceAudio] = useState(null);
  const [deapiEnhancingPrompt, setDeapiEnhancingPrompt] = useState(false);
  const [deapiEnhancerError, setDeapiEnhancerError] = useState("");
  const selectedDeapiModel = deapiModels.find((model) => model.slug === deapiModelSlug) || null;
  const effectiveDeapiLyrics = deapiLyricsMode === "instrumental"
    ? "[Instrumental]"
    : deapiLyrics.trim();
  const deapiCaptionMin = Number(selectedDeapiModel?.limits?.min_caption ?? 3);
  const deapiCaptionMax = Number(selectedDeapiModel?.limits?.max_caption ?? 300);
  const deapiCaptionLength = deapiCaption.trim().length;
  const hasValidDeapiCaptionLength = deapiCaptionLength >= deapiCaptionMin && deapiCaptionLength <= deapiCaptionMax;

  useEffect(() => {
    if (musicStream && musicOutputFormat !== "hex") {
      setMusicOutputFormat("hex");
    }
  }, [musicStream, musicOutputFormat]);

  useEffect(() => {
    if (musicInstrumental && musicLyricsOptimizer) {
      setMusicLyricsOptimizer(false);
    }
  }, [musicInstrumental, musicLyricsOptimizer]);

  useEffect(() => {
    if (!deapiEnhancerError) return;
    setDeapiEnhancerError("");
  }, [deapiCaption, deapiModelSlug]);

  useEffect(() => {
    if (!isDeapiMusic) return;

    let cancelled = false;
    const controller = new AbortController();

    const loadDeapiModels = async () => {
      setDeapiModelsLoading(true);
      setDeapiModelsError("");

      try {
        const token = getIdToken ? await getIdToken() : null;
        const res = await fetch(`${API_BASE}/api/deapi/music-models`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          signal: controller.signal,
        });

        if (!res.ok) {
          let message = `HTTP ${res.status}`;
          try {
            const payload = await res.json();
            message = payload.message || message;
          } catch {}
          throw new Error(message);
        }

        const payload = await res.json();
        if (cancelled) return;

        const nextModels = Array.isArray(payload.models) ? payload.models : [];
        setDeapiModels(nextModels);

        if (nextModels.length > 0) {
          const hasSelectedModel = nextModels.some((model) => model.slug === deapiModelSlug);
          if (!hasSelectedModel) {
            const preferredModel = nextModels[0];
            setDeapiModelSlug(preferredModel.slug);
            if (!deapiInferenceSteps && preferredModel.defaults?.inference_steps) {
              setDeapiInferenceSteps(Number(preferredModel.defaults.inference_steps));
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (!cancelled) {
          setDeapiModels([]);
          setDeapiModelsError(err.message || 'A deAPI modelllista nem tölthető be');
        }
      } finally {
        if (!cancelled) setDeapiModelsLoading(false);
      }
    };

    loadDeapiModels();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [getIdToken, isDeapiMusic]);

  useEffect(() => {
    if (!isDeapiMusic || !selectedDeapiModel?.limits) return;

    const limits = selectedDeapiModel.limits;
    const clampNumber = (value, { min = null, max = null, fallback = null, integer = false } = {}) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return fallback;
      let safeValue = parsed;
      if (Number.isFinite(min)) safeValue = Math.max(safeValue, min);
      if (Number.isFinite(max)) safeValue = Math.min(safeValue, max);
      return integer ? Math.round(safeValue) : safeValue;
    };

    setDeapiDuration((currentValue) => {
      const nextValue = clampNumber(currentValue, {
        min: Number(limits.min_duration ?? 10),
        max: Number(limits.max_duration ?? 600),
        fallback: Number(limits.min_duration ?? 30),
        integer: true,
      });
      return Number.isFinite(nextValue) ? nextValue : currentValue;
    });

    setDeapiInferenceSteps((currentValue) => {
      const nextValue = clampNumber(currentValue, {
        min: Number(limits.min_steps ?? 1),
        max: Number(limits.max_steps ?? 100),
        fallback: Number(limits.min_steps ?? 8),
        integer: true,
      });
      return Number.isFinite(nextValue) ? nextValue : currentValue;
    });

    setDeapiGuidanceScale((currentValue) => {
      const nextValue = clampNumber(currentValue, {
        min: Number(limits.min_guidance ?? 0),
        max: Number(limits.max_guidance ?? 20),
        fallback: Number(limits.min_guidance ?? 1),
      });
      return Number.isFinite(nextValue) ? nextValue : currentValue;
    });

    setDeapiBpm((currentValue) => {
      if (currentValue === "") return currentValue;
      const nextValue = clampNumber(currentValue, {
        min: Number(limits.min_bpm ?? 30),
        max: Number(limits.max_bpm ?? 300),
        fallback: "",
        integer: true,
      });
      return Number.isFinite(nextValue) ? nextValue : currentValue;
    });
  }, [isDeapiMusic, selectedDeapiModel?.slug]);

  const handleDeapiPromptEnhance = async () => {
    if (!isDeapiMusic || !deapiCaption.trim() || deapiEnhancingPrompt) return;

    const durationMin = Number(selectedDeapiModel?.limits?.min_duration ?? 10);
    const durationMax = Number(selectedDeapiModel?.limits?.max_duration ?? 600);
    const bpmMin = Number(selectedDeapiModel?.limits?.min_bpm ?? 30);
    const bpmMax = Number(selectedDeapiModel?.limits?.max_bpm ?? 300);

    setDeapiEnhancingPrompt(true);
    setDeapiEnhancerError("");

    try {
      const raw = await enhancePrompt({
        systemPrompt: DEAPI_MUSIC_ENHANCER_PROMPT,
        userPrompt: JSON.stringify({
          user_music_idea: deapiCaption.trim(),
          model_slug: deapiModelSlug,
          output_rules: {
            prompt_min_characters: deapiCaptionMin,
            prompt_max_characters: deapiCaptionMax,
            duration_seconds: { min: durationMin, max: durationMax },
            bpm: { min: bpmMin, max: bpmMax },
            keyscale: "must be a concrete musical key/scale string such as C major or F# minor",
            timesignature: "must be 2, 3, 4, 6 or null for auto",
            lyrics_mode: "must be auto-lyrics, lyrics, or instrumental",
          },
          notes: [
            "Never write actual lyrics text.",
            "Stay faithful to the user's intent.",
            "Prompt must be English and generation-ready.",
            "Always fill prompt, bpm, keyscale, duration, lyrics_mode.",
            "timesignature may be null if auto is best.",
          ],
        }, null, 2),
        temperature: 0.35,
        top_p: 0.9,
        max_tokens: 900,
        model: "openai/gpt-oss-120b",
        provider: "groq",
        getIdTokenOrToken: getIdToken,
      });

      const payload = extractEnhancerJson(raw);
      const nextPrompt = trimTextToMaxLength(payload.prompt || payload.caption || "", deapiCaptionMax);
      const nextKeyscale = String(payload.keyscale || "").trim();
      const nextLyricsMode = normalizeEnhancerLyricsMode(payload);
      const nextDuration = clampEnhancerNumber(payload.duration, durationMin, durationMax, { integer: true });
      const nextBpm = clampEnhancerNumber(payload.bpm, bpmMin, bpmMax, { integer: true });
      const nextTimeSignature = normalizeEnhancerTimeSignature(payload.timesignature);

      if (!nextPrompt) {
        throw new Error("Az AI valaszabol hianyzik a prompt.");
      }
      if (!nextKeyscale) {
        throw new Error("Az AI valaszabol hianyzik a key scale.");
      }
      if (!Number.isFinite(nextDuration)) {
        throw new Error("Az AI valaszabol hianyzik a duration.");
      }
      if (!Number.isFinite(nextBpm)) {
        throw new Error("Az AI valaszabol hianyzik a BPM.");
      }
      if (!nextLyricsMode) {
        throw new Error("Az AI valaszabol hianyzik a lyrics/instrumental valasztas.");
      }

      setDeapiCaption(nextPrompt);
      setDeapiBpm(String(nextBpm));
      setDeapiKeyscale(nextKeyscale);
      setDeapiDuration(String(nextDuration));
      setDeapiTimesignature(nextTimeSignature);
      setDeapiLyricsMode(nextLyricsMode);

      toast.success(
        nextLyricsMode === "lyrics"
          ? "Az AI kitoltotte a promptot es enekes modra allt. A dalszoveget mar te adod meg."
          : nextLyricsMode === "auto-lyrics"
            ? "Az AI kitoltotte a promptot es auto-lyrics modra allt."
          : "Az AI kitoltotte a zenei promptot es a fo parameterokat."
      );
    } catch (err) {
      const message = err.message || "A zenei prompt enhancer sikertelen.";
      setDeapiEnhancerError(message);
      toast.error(message);
    } finally {
      setDeapiEnhancingPrompt(false);
    }
  };

  const resetDeapiMusicDefaults = () => {
    setDeapiModelSlug(DEAPI_MUSIC_DEFAULTS.modelSlug);
    setDeapiLyricsMode(DEAPI_MUSIC_DEFAULTS.lyricsMode);
    setDeapiLyrics(DEAPI_MUSIC_DEFAULTS.lyrics);
    setDeapiDuration(DEAPI_MUSIC_DEFAULTS.duration);
    setDeapiInferenceSteps(DEAPI_MUSIC_DEFAULTS.inferenceSteps);
    setDeapiGuidanceScale(DEAPI_MUSIC_DEFAULTS.guidanceScale);
    setDeapiSeed(DEAPI_MUSIC_DEFAULTS.seed);
    setDeapiFormat(DEAPI_MUSIC_DEFAULTS.format);
    setDeapiBpm(DEAPI_MUSIC_DEFAULTS.bpm);
    setDeapiKeyscale(DEAPI_MUSIC_DEFAULTS.keyscale);
    setDeapiTimesignature(DEAPI_MUSIC_DEFAULTS.timesignature);
    setDeapiVocalLanguage(DEAPI_MUSIC_DEFAULTS.vocalLanguage);
    setDeapiWebhookUrl(DEAPI_MUSIC_DEFAULTS.webhookUrl);
    setDeapiEnhancerError("");
  };

  const generateDeapiAutoLyrics = async () => {
    const raw = await enhancePrompt({
      systemPrompt: DEAPI_AUTO_LYRICS_PROMPT,
      userPrompt: JSON.stringify({
        caption: deapiCaption.trim(),
        duration_seconds: deapiDuration,
        bpm: deapiBpm === "" ? null : Number(deapiBpm),
        keyscale: deapiKeyscale.trim() || null,
        timesignature: deapiTimesignature || null,
        vocal_language: "unknown",
        model_slug: deapiModelSlug,
      }, null, 2),
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 1400,
      model: "openai/gpt-oss-120b",
      provider: "groq",
      getIdTokenOrToken: getIdToken,
    });

    const lyricsText = unwrapAiText(raw);
    if (!lyricsText) {
      throw new Error("Az AI nem adott vissza dalszoveget az auto-lyrics modhoz.");
    }

    return lyricsText;
  };

  const clampDeapiCommittedValue = (rawValue, { min, max, fallback, integer = false, allowEmpty = false } = {}) => {
    const textValue = String(rawValue ?? "").trim();
    if (!textValue) {
      return allowEmpty ? "" : String(fallback);
    }

    const normalizedValue = textValue.replace(",", ".");
    const parsedValue = Number(normalizedValue);
    if (!Number.isFinite(parsedValue)) {
      return allowEmpty ? "" : String(fallback);
    }

    let nextValue = Math.min(Math.max(parsedValue, min), max);
    if (integer) {
      nextValue = Math.round(nextValue);
      return String(nextValue);
    }

    return String(Number(nextValue.toFixed(4)));
  };

  const commitDeapiDuration = () => {
    const minValue = Number(selectedDeapiModel?.limits?.min_duration ?? 10);
    const maxValue = Number(selectedDeapiModel?.limits?.max_duration ?? 600);
    setDeapiDuration((currentValue) =>
      clampDeapiCommittedValue(currentValue, {
        min: minValue,
        max: maxValue,
        fallback: minValue,
        integer: true,
      })
    );
  };

  const commitDeapiInferenceSteps = () => {
    const minValue = Number(selectedDeapiModel?.limits?.min_steps ?? 1);
    const maxValue = Number(selectedDeapiModel?.limits?.max_steps ?? 100);
    setDeapiInferenceSteps((currentValue) =>
      clampDeapiCommittedValue(currentValue, {
        min: minValue,
        max: maxValue,
        fallback: minValue,
        integer: true,
      })
    );
  };

  const commitDeapiGuidanceScale = () => {
    const minValue = Number(selectedDeapiModel?.limits?.min_guidance ?? 0);
    const maxValue = Number(selectedDeapiModel?.limits?.max_guidance ?? 20);
    setDeapiGuidanceScale((currentValue) =>
      clampDeapiCommittedValue(currentValue, {
        min: minValue,
        max: maxValue,
        fallback: minValue,
      })
    );
  };

  const commitDeapiBpm = () => {
    const minValue = Number(selectedDeapiModel?.limits?.min_bpm ?? 30);
    const maxValue = Number(selectedDeapiModel?.limits?.max_bpm ?? 300);
    setDeapiBpm((currentValue) =>
      clampDeapiCommittedValue(currentValue, {
        min: minValue,
        max: maxValue,
        fallback: "",
        integer: true,
        allowEmpty: true,
      })
    );
  };

  const clearDeapiReferenceAudio = () => {
    setDeapiReferenceAudio(null);
  };

  const handleDeapiReferenceAudioSelect = async (file) => {
    if (!file) {
      clearDeapiReferenceAudio();
      return;
    }

    const fileExtension = getFileExtension(file.name);
    const hasSupportedMime = DEAPI_REFERENCE_AUDIO_MIME_TYPES.has(file.type);
    const hasSupportedExtension = DEAPI_REFERENCE_AUDIO_EXTENSIONS.has(fileExtension);

    if (!hasSupportedMime && !hasSupportedExtension) {
      toast.error("Csak MP3, WAV, FLAC, OGG vagy M4A referencia audio toltheto fel.");
      return;
    }

    if (file.size > DEAPI_REFERENCE_AUDIO_MAX_BYTES) {
      toast.error("A referencia audio merete legfeljebb 10 MB lehet.");
      return;
    }

    try {
      const duration = await readAudioDuration(file);
      const minDuration = Number(selectedDeapiModel?.limits?.min_ref_audio_duration ?? 5);
      const maxDuration = Number(selectedDeapiModel?.limits?.max_ref_audio_duration ?? 60);

      if (Number.isFinite(duration) && (duration < minDuration || duration > maxDuration)) {
        toast.error(`A referencia audio hossza ${minDuration}-${maxDuration} masodperc kozott lehet.`);
        return;
      }

      setDeapiReferenceAudio({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        duration,
      });
    } catch (err) {
      toast.error(err.message || "A referencia audio nem olvashato be.");
    }
  };

  // Common
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioInfo, setAudioInfo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

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

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  const deapiHasHttpsWebhook = !deapiWebhookUrl.trim() || /^https:\/\//i.test(deapiWebhookUrl.trim());
  const canGenerateMiniMax = musicInstrumental
    ? !!musicPrompt.trim()
    : !!musicLyrics.trim() || (musicLyricsOptimizer && !!musicPrompt.trim());
  const canGenerateDeapi = !!deapiCaption.trim()
    && !!deapiModelSlug.trim()
    && hasValidDeapiCaptionLength
    && deapiHasHttpsWebhook
    && (deapiLyricsMode === "instrumental" || deapiLyricsMode === "auto-lyrics" || !!deapiLyrics.trim());
  const currentMusicContent = isDeapiMusic
    ? (deapiCaption || (deapiLyricsMode === "lyrics" ? effectiveDeapiLyrics : ""))
    : (musicPrompt || musicLyrics);

  const handleGenerate = async () => {
    const canGenerateMusic = isDeapiMusic ? canGenerateDeapi : canGenerateMiniMax;
    const content = isTTS ? text : currentMusicContent;
    if ((isTTS ? !text.trim() : !canGenerateMusic) || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    setAudioInfo(null);
    setIsPlaying(false);
    closeMobileStudioPanel();
    const jobId = startJob(isTTS ? 'audio' : 'music', (content || 'Hanggenerálás').slice(0, 48), 'audio');
    setCurrentJobId(jobId);
    generationController.current = new AbortController();

    try {
      const token = getIdToken ? await getIdToken() : null;
      const endpoint = isTTS ? `${API_BASE}/api/generate-tts` : `${API_BASE}/api/generate-music`;
      let resolvedDeapiLyrics = effectiveDeapiLyrics;

      if (!isTTS && isDeapiMusic && deapiLyricsMode === "auto-lyrics") {
        resolvedDeapiLyrics = await generateDeapiAutoLyrics();
        setDeapiLyrics(resolvedDeapiLyrics);
      }

      let body;
      let headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
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
        headers["Content-Type"] = "application/json";
      } else {
        if (isDeapiMusic) {
          const formData = new FormData();
          const deapiPayload = {
            apiId: selectedModel.apiId,
            provider: selectedModel.provider,
            model: deapiModelSlug,
            caption: deapiCaption,
            lyrics: resolvedDeapiLyrics,
            duration: deapiDuration,
            inference_steps: deapiInferenceSteps,
            guidance_scale: deapiGuidanceScale,
            seed: deapiSeed,
            format: deapiFormat.trim(),
            bpm: deapiBpm === "" ? null : Number(deapiBpm),
            keyscale: deapiKeyscale.trim() || null,
            timesignature: deapiTimesignature ? Number(deapiTimesignature) : null,
            vocal_language: "unknown",
            webhook_url: deapiWebhookUrl.trim() || null,
            jobId,
          };
          Object.entries(deapiPayload).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "") return;
            formData.append(key, String(value));
          });
          if (deapiReferenceAudio?.file) {
            formData.append("reference_audio", deapiReferenceAudio.file, deapiReferenceAudio.file.name);
          }
          body = formData;
        } else {
          body = {
            apiId: selectedModel.apiId,
            provider: selectedModel.provider,
            prompt: musicPrompt,
            lyrics: musicLyrics,
            lyrics_optimizer: musicInstrumental ? false : musicLyricsOptimizer,
            is_instrumental: musicInstrumental,
            stream: musicStream,
            output_format: musicStream ? "hex" : musicOutputFormat,
            audio_setting: {
              sample_rate: musicSampleRate,
              bitrate: musicBitrate,
              format: musicFileFormat,
            },
            jobId,
          };
        }
        if (!isDeapiMusic) {
          headers["Content-Type"] = "application/json";
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: isDeapiMusic ? body : JSON.stringify(body),
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
      setAudioInfo(
        isTTS
          ? {
              fileFormat: isNvidiaRiva ? "wav" : audioFormat,
              sampleRate: isNvidiaRiva ? 22050 : null,
              bitrate: null,
              outputFormat: "data",
              stream: false,
            }
          : {
              fileFormat: data.fileFormat || (isDeapiMusic ? deapiFormat : musicFileFormat),
              sampleRate: data.sampleRate || (isDeapiMusic ? null : musicSampleRate),
              bitrate: data.bitrate || (isDeapiMusic ? null : musicBitrate),
              outputFormat: data.outputFormat || (isDeapiMusic ? "url" : (musicStream ? "hex" : musicOutputFormat)),
              stream: Boolean(data.stream ?? (isDeapiMusic ? false : musicStream)),
            }
      );
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
              : isDeapiMusic
                ? {
                    caption: deapiCaption,
                    lyrics: resolvedDeapiLyrics,
                    lyricsMode: deapiLyricsMode,
                    instrumental: deapiLyricsMode === "instrumental",
                    autoLyrics: deapiLyricsMode === "auto-lyrics",
                    deapiModel: deapiModelSlug,
                    duration: deapiDuration,
                    inferenceSteps: deapiInferenceSteps,
                    guidanceScale: deapiGuidanceScale,
                    seed: deapiSeed,
                    fileFormat: data.fileFormat || deapiFormat,
                    bpm: deapiBpm === "" ? null : Number(deapiBpm),
                    keyscale: deapiKeyscale.trim() || null,
                    timesignature: deapiTimesignature ? Number(deapiTimesignature) : null,
                    vocalLanguage: "unknown",
                    webhookUrl: deapiWebhookUrl.trim() || null,
                    hasReferenceAudio: Boolean(deapiReferenceAudio?.file),
                    referenceAudioName: deapiReferenceAudio?.name || null,
                    referenceAudioSize: deapiReferenceAudio?.size || null,
                    referenceAudioDuration: deapiReferenceAudio?.duration ?? null,
                    requestId: data.requestId || null,
                  }
                : {
                    lyrics: musicLyrics,
                    lyricsOptimizer: musicInstrumental ? false : musicLyricsOptimizer,
                    instrumental: musicInstrumental,
                    stream: musicStream,
                    outputFormat: data.outputFormat || (musicStream ? "hex" : musicOutputFormat),
                    sampleRate: data.sampleRate || musicSampleRate,
                    bitrate: data.bitrate || musicBitrate,
                    fileFormat: data.fileFormat || musicFileFormat,
                  }),
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

  return (
    <StudioLayout
      leftOpen={leftOpen}
      setLeftOpen={toggleGlobalSidebar}
      leftSecondaryOpen={leftSecondaryOpen}
      setLeftSecondaryOpen={setLeftSecondaryOpen}
      rightOpen={rightOpen}
      setRightOpen={setRightOpen}
      leftWidth={320}
      leftSecondaryWidth={isMobile ? 392 : view === 'history' ? 72 : 392}
      onOffsetChange={setOffsets}
      leftSidebar={globalSidebar}
      leftSecondarySidebar={
        <div className={`h-full flex overflow-hidden bg-[#060410]/60 backdrop-blur-3xl border-r border-white/5 ${isMobile ? 'flex-col' : 'flex-row'}`}>
          {/* Tool Strip (72px) */}
          <div className={isMobile
            ? "w-full shrink-0 grid grid-cols-2 gap-2 border-b border-white/5 bg-[#030308] px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+4.5rem)]"
            : "w-[72px] h-full flex flex-col items-center pt-6 space-y-3 border-r border-white/5 bg-[#030308]"}>
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
                onClick: () => {
                  if (isMobile || isTablet) {
                    if (view !== 'history') {
                      setView('history');
                    }
                    closeNarrowStudioPanel();
                    return;
                  }
                  setView('history');
                },
              },
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={tool.onClick}
                title={tool.label}
                className={isMobile
                  ? "group flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/5 bg-white/[0.02] px-2 py-2.5 transition-all duration-300 cursor-pointer"
                  : "group flex flex-col items-center gap-1.5 transition-all duration-300 border-none bg-transparent cursor-pointer"}
              >
                <div
                  className={`${isMobile ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-2xl'} flex items-center justify-center transition-all duration-500 border ${tool.isActive
                      ? 'bg-white/5 border-white/10 shadow-xl'
                      : 'bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/5'
                    }`}
                  style={tool.isActive ? { borderColor: `${color}40`, color } : { color: '#52525b' }}
                >
                  {tool.icon}
                </div>
                <span className={`${isMobile ? 'text-[8px] tracking-[0.14em] text-center leading-tight' : 'text-[8px] tracking-[0.2em]'} font-black transition-all duration-500 ${tool.isActive ? 'text-white' : 'text-zinc-700 group-hover:text-zinc-500'
                  }`}>
                  {tool.label}
                </span>
              </button>
            ))}
            <div className={isMobile ? "hidden" : "flex-1"} />
          </div>

          <div className="flex-1 h-full min-h-0 overflow-hidden">
            {view !== 'history' && (
              <AudioControls
                selectedModel={selectedModel}
                onModelChange={(model) => {
                  setAudioUrl(null);
                  setAudioInfo(null);
                  setIsPlaying(false);
                  onModelChange?.(model);
                }}
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
                musicLyrics={musicLyrics} setMusicLyrics={setMusicLyrics}
                musicLyricsOptimizer={musicLyricsOptimizer} setMusicLyricsOptimizer={setMusicLyricsOptimizer}
                musicInstrumental={musicInstrumental} setMusicInstrumental={setMusicInstrumental}
                musicStream={musicStream} setMusicStream={setMusicStream}
                musicOutputFormat={musicOutputFormat} setMusicOutputFormat={setMusicOutputFormat}
                musicSampleRate={musicSampleRate} setMusicSampleRate={setMusicSampleRate}
                musicBitrate={musicBitrate} setMusicBitrate={setMusicBitrate}
                musicFileFormat={musicFileFormat} setMusicFileFormat={setMusicFileFormat}
                deapiModels={deapiModels}
                deapiModelsLoading={deapiModelsLoading}
                deapiModelsError={deapiModelsError}
                deapiModelSlug={deapiModelSlug} setDeapiModelSlug={setDeapiModelSlug}
                deapiCaption={deapiCaption} setDeapiCaption={setDeapiCaption}
                deapiEnhancingPrompt={deapiEnhancingPrompt}
                deapiEnhancerError={deapiEnhancerError}
                onDeapiEnhancePrompt={handleDeapiPromptEnhance}
                onDeapiResetDefaults={resetDeapiMusicDefaults}
                deapiLyricsMode={deapiLyricsMode} setDeapiLyricsMode={setDeapiLyricsMode}
                deapiLyrics={deapiLyrics} setDeapiLyrics={setDeapiLyrics}
                deapiDuration={deapiDuration} setDeapiDuration={setDeapiDuration}
                onCommitDeapiDuration={commitDeapiDuration}
                deapiInferenceSteps={deapiInferenceSteps} setDeapiInferenceSteps={setDeapiInferenceSteps}
                onCommitDeapiInferenceSteps={commitDeapiInferenceSteps}
                deapiGuidanceScale={deapiGuidanceScale} setDeapiGuidanceScale={setDeapiGuidanceScale}
                onCommitDeapiGuidanceScale={commitDeapiGuidanceScale}
                deapiSeed={deapiSeed} setDeapiSeed={setDeapiSeed}
                deapiFormat={deapiFormat} setDeapiFormat={setDeapiFormat}
                deapiBpm={deapiBpm} setDeapiBpm={setDeapiBpm}
                onCommitDeapiBpm={commitDeapiBpm}
                deapiKeyscale={deapiKeyscale} setDeapiKeyscale={setDeapiKeyscale}
                deapiTimesignature={deapiTimesignature} setDeapiTimesignature={setDeapiTimesignature}
                deapiWebhookUrl={deapiWebhookUrl} setDeapiWebhookUrl={setDeapiWebhookUrl}
                deapiReferenceAudio={deapiReferenceAudio}
                onDeapiReferenceAudioSelect={handleDeapiReferenceAudioSelect}
                onDeapiReferenceAudioClear={clearDeapiReferenceAudio}
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
          audioInfo={audioInfo}
          error={error}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          color={color}
          history={history}
          onHistorySelect={(item) => {
            setAudioUrl(item.audioUrl);
            setAudioInfo({
              fileFormat: item.fileFormat || item.format || (item.type === 'tts' && item.voiceName ? 'wav' : 'mp3'),
              sampleRate: item.sampleRate || null,
              bitrate: item.bitrate || null,
              outputFormat: item.outputFormat || null,
              stream: Boolean(item.stream),
            });
            setView('forge');
            setIsPlaying(false);
          }}
        />
        {audioUrl && <audio ref={audioRef} src={audioUrl} />}
      </div>
    </StudioLayout>
  );
}
