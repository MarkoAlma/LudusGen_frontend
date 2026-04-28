import React, { useState, useRef, useEffect } from "react";
import { useJobs } from '../context/JobsContext';
import toast from "react-hot-toast";
import {
  Music, Play, Pause, Download, Loader2, XCircle, Mic,
  Bookmark, History, Volume2, X, Globe, Sparkles, Settings2, Activity, Zap, ActivitySquare, Speaker,
  PanelLeftClose, PanelLeftOpen, Layout
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import BackgroundFilters from '../components/chat/BackgroundFilters';
import AudioEngineBg from '../assets/backgrounds/motif_audio_bg.png';
import StudioLayout from '../components/shared/StudioLayout';
import { useStudioPanels } from '../context/StudioPanelContext';
import AudioControls from '../components/audio_studio/AudioControls';
import AudioWorkspace from '../components/audio_studio/AudioWorkspace';

import { API_BASE, enhancePrompt } from "../api/client";

const TTS_VOICES = [
  { id: "alloy", label: "Alloy", desc: "Neutral, balanced" },
  { id: "echo", label: "Echo", desc: "Melancholic, deep" },
  { id: "fable", label: "Fable", desc: "Expressive, British accent" },
  { id: "onyx", label: "Onyx", desc: "Deep, authoritative" },
  { id: "nova", label: "Nova", desc: "Energetic, friendly" },
  { id: "shimmer", label: "Shimmer", desc: "Soft, pleasant" },
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
    { name: "Aria", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Diego", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "Isabela", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Jason", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Happy"] },
    { name: "Leo", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Sad"] },
    { name: "Louise", desc: "Female voice", emotions: [] },
    { name: "Mia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Ray", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Sofia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
  ],
  "ES-US": [
    { name: "Aria", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Diego", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "Isabela", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Jason", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Happy"] },
    { name: "Leo", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Sad"] },
    { name: "Louise", desc: "Female voice", emotions: [] },
    { name: "Mia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Ray", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Sofia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
  ],
  "FR-FR": [
    { name: "Aria", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Diego", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "Isabela", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Jason", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Happy"] },
    { name: "Leo", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Sad"] },
    { name: "Louise", desc: "Female voice", emotions: [] },
    { name: "Mia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Ray", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Sofia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
  ],
  "DE-DE": [
    { name: "Diego", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "Mia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Sofia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
  ],
  "ZH-CN": [
    { name: "Aria", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Diego", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "HouZhen", desc: "Male voice", emotions: [] },
    { name: "Isabela", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Long", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgusted", "Fearful", "Happy", "Sad"] },
    { name: "Louise", desc: "Female voice", emotions: [] },
    { name: "Mia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Ray", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Siwei", desc: "Female voice", emotions: [] },
  ],
  "IT-IT": [
    { name: "Isabela", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Pascal", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
  ],
  "VI-VN": [
    { name: "Aria", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Jason", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Happy"] },
    { name: "Leo", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Sad"] },
    { name: "Long", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgusted", "Fearful", "Happy", "Sad"] },
    { name: "Mia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Phung", desc: "Male voice", emotions: ["Neutral", "Angry", "Disgusted", "Fearful", "Happy", "Sad"] },
    { name: "Ray", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Sofia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
  ],
  "HI-IN": [
    { name: "Aria", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Diego", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "HouZhen", desc: "Male voice", emotions: [] },
    { name: "Isabela", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Jason", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Happy"] },
    { name: "Leo", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Sad"] },
    { name: "Long", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgusted", "Fearful", "Happy", "Sad"] },
    { name: "Mia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Phung", desc: "Male voice", emotions: ["Neutral", "Angry", "Disgusted", "Fearful", "Happy", "Sad"] },
    { name: "Ray", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Siwei", desc: "Female voice", emotions: [] },
    { name: "Sofia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
  ],
  "JA-JP": [
    { name: "Aria", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "Sad"] },
    { name: "Diego", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "PleasantSurprised"] },
    { name: "HouZhen", desc: "Male voice", emotions: [] },
    { name: "Isabela", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy", "PleasantSurprised", "Sad"] },
    { name: "Jason", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Happy"] },
    { name: "Long", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgusted", "Fearful", "Happy", "Sad"] },
    { name: "Louise", desc: "Female voice", emotions: [] },
    { name: "Mia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Happy", "Sad"] },
    { name: "Pascal", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Disgust", "Happy", "Sad"] },
    { name: "Ray", desc: "Male voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
    { name: "Siwei", desc: "Female voice", emotions: [] },
    { name: "Sofia", desc: "Female voice", emotions: ["Neutral", "Angry", "Calm", "Fearful", "Happy"] },
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
  Neutral: "Neutral",
  Angry: "Angry",
  Calm: "Calm",
  Happy: "Happy",
  Sad: "Sad",
  Fearful: "Fearful",
  Disgust: "Disgusted",
  Disgusted: "Disgusted",
  PleasantSurprised: "Surprised",
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
const DEAPI_TTS_DEFAULTS = {
  mode: "custom_voice",
  voice: "af_sky",
  lang: "en-us",
  speed: 1,
  format: "mp3",
  sampleRate: 24000,
  refText: "",
  instruct: "",
};
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
const DEAPI_MUSIC_MODEL_OPTIONS = [
  { slug: "AceStep_1_5_XL_Turbo_INT8", name: "Ace Step 1.5 XL Turbo INT8" },
  { slug: "AceStep_1_5_Base", name: "Ace Step 1.5 Base" },
];
const normalizeDeapiModelSlug = (slug) => String(slug || "").trim().toLowerCase();
const findSupportedDeapiModelOption = (slug) => {
  const normalizedSlug = normalizeDeapiModelSlug(slug);
  return DEAPI_MUSIC_MODEL_OPTIONS.find((model) => normalizeDeapiModelSlug(model.slug) === normalizedSlug) || null;
};
const DEAPI_TURBO_INT8_MODEL_SLUG = "acestep_1_5_xl_turbo_int8";
const isDeapiTurboInt8ModelSlug = (slug) => normalizeDeapiModelSlug(slug) === DEAPI_TURBO_INT8_MODEL_SLUG;
const getDeapiLimitNumber = (limits, key, fallback) => {
  const value = Number(limits?.[key]);
  return Number.isFinite(value) ? value : fallback;
};
const getDeapiGuidanceLimits = (model, modelSlug) => {
  if (isDeapiTurboInt8ModelSlug(modelSlug)) {
    return { min: 1, max: 1 };
  }

  const limits = model?.limits || {};
  return {
    min: getDeapiLimitNumber(limits, "min_guidance", 0),
    max: getDeapiLimitNumber(limits, "max_guidance", 20),
  };
};
const getDeapiBpmLimits = (model, modelSlug) => {
  const limits = model?.limits || {};
  const rawMin = getDeapiLimitNumber(limits, "min_bpm", 30);
  const rawMax = getDeapiLimitNumber(limits, "max_bpm", 300);
  const max = isDeapiTurboInt8ModelSlug(modelSlug) ? Math.min(rawMax, 200) : rawMax;

  return {
    min: Math.min(rawMin, max),
    max,
  };
};
const getDeapiStepLimits = (model, modelSlug) => {
  if (isDeapiTurboInt8ModelSlug(modelSlug)) {
    return { min: 8, max: 8 };
  }

  const limits = model?.limits || {};
  return {
    min: getDeapiLimitNumber(limits, "min_steps", 1),
    max: getDeapiLimitNumber(limits, "max_steps", 100),
  };
};

const getDeapiModelGenerationDefaults = (modelSlug) => {
  const normalizedSlug = String(modelSlug || "").toLowerCase();
  const isBaseModel = normalizedSlug === "acestep_1_5_base" || normalizedSlug.includes("1_5_base");

  return isBaseModel
    ? { inferenceSteps: "60", guidanceScale: "9" }
    : { inferenceSteps: "8", guidanceScale: "1" };
};

const DEAPI_MUSIC_DEFAULTS = {
  modelSlug: "AceStep_1_5_Base",
  lyricsMode: "instrumental",
  lyrics: "",
  duration: "60",
  ...getDeapiModelGenerationDefaults("AceStep_1_5_Base"),
  seed: "",
  format: "mp3",
  bpm: "",
  keyscale: "",
  timesignature: "",
  vocalLanguage: "unknown",
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
      reject(new Error("Reference audio metadata could not be read"));
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
    throw new Error("The AI response is not valid JSON.");
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


export default function AudioPanel({ selectedModel, onModelChange, userId, getIdToken, isGlobalOpen, toggleGlobalSidebar, globalSidebar, onActiveJobChange, isJobForeground }) {
  const { jobs, addJob, updateJob, markJobDone, markJobDoneAndSeen, markJobError, registerCancelHandler, unregisterCancelHandler } = useJobs();
  const [currentJobId, setCurrentJobId] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const startJob = (kind, title, targetTab) => {
    const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    addJob({ id, kind, panelType: 'audio', modelId: selectedModel.id, title, status: 'running', progress: 0, createdAt: Date.now(), updatedAt: Date.now(), errorMessage: null, completedAt: null, seenAt: null, targetTab });
    return id;
  };

  const isAudioJobForeground = (jobId) => (
    isJobForeground?.({ id: jobId, panelType: 'audio' }) ?? true
  );

  const finishAudioJob = (jobId, patch = {}) => {
    const donePatch = { progress: 100, updatedAt: Date.now(), completedAt: Date.now(), ...patch };
    if (isAudioJobForeground(jobId)) {
      markJobDoneAndSeen(jobId, donePatch);
      return;
    }
    markJobDone(jobId, donePatch);
  };

  const failAudioJob = (jobId, message) => {
    markJobError(jobId, message);
    if (isAudioJobForeground(jobId)) {
      updateJob(jobId, { seenAt: Date.now() });
    }
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
  const isDeapiTTS = selectedModel.audioType === "tts" && selectedModel.provider === "deapi";
  const isDeapiMusic = selectedModel.audioType === "music" && selectedModel.provider === "deapi";

  const [activeTab, setActiveTab] = useState("generate");
  const [view, setView] = useState("forge");

  useEffect(() => {
    const jobId = view === 'history' ? null : currentJobId || selectedJobId;
    if (jobId) {
      onActiveJobChange?.({ panelType: 'audio', jobId });
    } else {
      onActiveJobChange?.(null);
    }

    return () => onActiveJobChange?.(null);
  }, [currentJobId, selectedJobId, view, onActiveJobChange]);

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

  // deAPI TTS
  const [deapiTtsVariant, setDeapiTtsVariant] = useState("");
  const [deapiTtsMode, setDeapiTtsMode] = useState(DEAPI_TTS_DEFAULTS.mode);
  const [deapiTtsVoice, setDeapiTtsVoice] = useState(DEAPI_TTS_DEFAULTS.voice);
  const [deapiTtsLang, setDeapiTtsLang] = useState(DEAPI_TTS_DEFAULTS.lang);
  const [deapiTtsSpeed, setDeapiTtsSpeed] = useState(DEAPI_TTS_DEFAULTS.speed);
  const [deapiTtsFormat, setDeapiTtsFormat] = useState(DEAPI_TTS_DEFAULTS.format);
  const [deapiTtsSampleRate, setDeapiTtsSampleRate] = useState(DEAPI_TTS_DEFAULTS.sampleRate);
  const [deapiTtsRefText, setDeapiTtsRefText] = useState(DEAPI_TTS_DEFAULTS.refText);
  const [deapiTtsInstruct, setDeapiTtsInstruct] = useState(DEAPI_TTS_DEFAULTS.instruct);
  const [deapiTtsReferenceAudio, setDeapiTtsReferenceAudio] = useState(null);
  const deapiTtsVariants = Array.isArray(selectedModel.deapiTtsVariants) ? selectedModel.deapiTtsVariants : [];
  const selectedDeapiTtsVariant = deapiTtsVariants.find((variant) => variant.id === deapiTtsVariant) || deapiTtsVariants[0] || null;
  const effectiveDeapiTtsMode = selectedDeapiTtsVariant?.mode || deapiTtsMode;
  const effectiveDeapiTtsModelSlug = selectedDeapiTtsVariant?.slug || selectedModel.deapiTtsModelSlug || selectedModel.apiModel;
  const effectiveDeapiTtsDefaults = selectedDeapiTtsVariant?.defaults || selectedModel.deapiTtsDefaults || DEAPI_TTS_DEFAULTS;
  const effectiveDeapiTtsLimits = selectedDeapiTtsVariant?.limits || selectedModel.deapiTtsLimits || {};

  useEffect(() => {
    if (!isDeapiTTS) return;
    const variants = Array.isArray(selectedModel.deapiTtsVariants) ? selectedModel.deapiTtsVariants : [];
    const defaultVariant = variants.find((variant) => variant.id === selectedModel.deapiTtsDefaultVariant) || variants[0] || null;
    const defaults = defaultVariant?.defaults || selectedModel.deapiTtsDefaults || DEAPI_TTS_DEFAULTS;
    const nextMode = defaultVariant?.mode || selectedModel.deapiTtsDefaultMode || DEAPI_TTS_DEFAULTS.mode;

    setDeapiTtsVariant(defaultVariant?.id || "");
    setDeapiTtsMode(nextMode);
    setDeapiTtsVoice(defaults.voice || "");
    setDeapiTtsLang(defaults.lang || DEAPI_TTS_DEFAULTS.lang);
    setDeapiTtsSpeed(defaults.speed ?? DEAPI_TTS_DEFAULTS.speed);
    setDeapiTtsFormat(defaults.format || DEAPI_TTS_DEFAULTS.format);
    setDeapiTtsSampleRate(defaults.sampleRate || DEAPI_TTS_DEFAULTS.sampleRate);
    setDeapiTtsInstruct(defaults.instruct || "");

    if (nextMode !== "voice_clone") {
      setDeapiTtsReferenceAudio(null);
      setDeapiTtsRefText("");
    }
  }, [isDeapiTTS, selectedModel.id, selectedModel.deapiTtsModelSlug, selectedModel.apiModel, selectedModel.deapiTtsDefaultMode, selectedModel.deapiTtsDefaultVariant]);

  useEffect(() => {
    if (!isDeapiTTS || !selectedDeapiTtsVariant) return;
    const defaults = selectedDeapiTtsVariant.defaults || DEAPI_TTS_DEFAULTS;
    setDeapiTtsMode(selectedDeapiTtsVariant.mode || DEAPI_TTS_DEFAULTS.mode);
    setDeapiTtsVoice(defaults.voice || "");
    setDeapiTtsLang(defaults.lang || DEAPI_TTS_DEFAULTS.lang);
    setDeapiTtsSpeed(defaults.speed ?? DEAPI_TTS_DEFAULTS.speed);
    setDeapiTtsFormat(defaults.format || DEAPI_TTS_DEFAULTS.format);
    setDeapiTtsSampleRate(defaults.sampleRate || DEAPI_TTS_DEFAULTS.sampleRate);
    setDeapiTtsInstruct(defaults.instruct || "");
    if (selectedDeapiTtsVariant.mode !== "voice_clone") {
      setDeapiTtsReferenceAudio(null);
      setDeapiTtsRefText("");
    }
  }, [isDeapiTTS, selectedDeapiTtsVariant?.id]);

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

  const handleDeapiModelSlugChange = (nextModelSlug) => {
    const supportedModel = findSupportedDeapiModelOption(nextModelSlug);
    const safeModelSlug = supportedModel?.slug || DEAPI_MUSIC_DEFAULTS.modelSlug;
    const nextDefaults = getDeapiModelGenerationDefaults(safeModelSlug);
    setDeapiModelSlug(safeModelSlug);
    setDeapiInferenceSteps(nextDefaults.inferenceSteps);
    setDeapiGuidanceScale(nextDefaults.guidanceScale);
  };

  useEffect(() => {
    if (!isDeapiMusic) return;
    if (!selectedModel.deapiModelSlug) return;
    handleDeapiModelSlugChange(selectedModel.deapiModelSlug);
  }, [isDeapiMusic, selectedModel.id, selectedModel.deapiModelSlug]);

  useEffect(() => {
    if (!isDeapiMusic || deapiLyricsMode) return;
    setDeapiLyricsMode(DEAPI_MUSIC_DEFAULTS.lyricsMode);
  }, [isDeapiMusic, deapiLyricsMode]);

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

        const apiModels = Array.isArray(payload.models) ? payload.models : [];
        const nextModels = DEAPI_MUSIC_MODEL_OPTIONS.map((modelOption) => {
          const apiModel = apiModels.find((model) =>
            normalizeDeapiModelSlug(model.slug) === normalizeDeapiModelSlug(modelOption.slug)
          );

          return {
            name: apiModel?.name || modelOption.name,
            slug: modelOption.slug,
            defaults: apiModel?.defaults || {},
            limits: apiModel?.limits || {},
          };
        });
        setDeapiModels(nextModels);

        if (nextModels.length > 0) {
          const preferredModel = findSupportedDeapiModelOption(selectedModel.deapiModelSlug || deapiModelSlug) || DEAPI_MUSIC_MODEL_OPTIONS[0];
          const hasSelectedModel = nextModels.some((model) =>
            normalizeDeapiModelSlug(model.slug) === normalizeDeapiModelSlug(preferredModel.slug)
          );
          if (hasSelectedModel) {
            handleDeapiModelSlugChange(preferredModel.slug);
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (!cancelled) {
          setDeapiModels([]);
          setDeapiModelsError(err.message || 'The deAPI model list could not be loaded');
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
  }, [getIdToken, isDeapiMusic, selectedModel.deapiModelSlug]);

  useEffect(() => {
    if (!isDeapiMusic) return;

    const limits = selectedDeapiModel?.limits || {};
    const stepLimits = getDeapiStepLimits(selectedDeapiModel, deapiModelSlug);
    const guidanceLimits = getDeapiGuidanceLimits(selectedDeapiModel, deapiModelSlug);
    const bpmLimits = getDeapiBpmLimits(selectedDeapiModel, deapiModelSlug);
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
        min: stepLimits.min,
        max: stepLimits.max,
        fallback: stepLimits.min,
        integer: true,
      });
      return Number.isFinite(nextValue) ? nextValue : currentValue;
    });

    setDeapiGuidanceScale((currentValue) => {
      const nextValue = clampNumber(currentValue, {
        min: guidanceLimits.min,
        max: guidanceLimits.max,
        fallback: guidanceLimits.min,
      });
      return Number.isFinite(nextValue) ? nextValue : currentValue;
    });

    setDeapiBpm((currentValue) => {
      if (currentValue === "") return currentValue;
      const nextValue = clampNumber(currentValue, {
        min: bpmLimits.min,
        max: bpmLimits.max,
        fallback: "",
        integer: true,
      });
      return Number.isFinite(nextValue) ? nextValue : currentValue;
    });
  }, [isDeapiMusic, selectedDeapiModel?.slug, deapiModelSlug]);

  const handleDeapiPromptEnhance = async () => {
    if (!isDeapiMusic || !deapiCaption.trim() || deapiEnhancingPrompt) return;

    const durationMin = Number(selectedDeapiModel?.limits?.min_duration ?? 10);
    const durationMax = Number(selectedDeapiModel?.limits?.max_duration ?? 600);
    const bpmLimits = getDeapiBpmLimits(selectedDeapiModel, deapiModelSlug);
    const bpmMin = bpmLimits.min;
    const bpmMax = bpmLimits.max;

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
        throw new Error("The AI response is missing the prompt.");
      }
      if (!nextKeyscale) {
        throw new Error("The AI response is missing the key scale.");
      }
      if (!Number.isFinite(nextDuration)) {
        throw new Error("The AI response is missing the duration.");
      }
      if (!Number.isFinite(nextBpm)) {
        throw new Error("The AI response is missing the BPM.");
      }
      if (!nextLyricsMode) {
        throw new Error("The AI response is missing the lyrics/instrumental choice.");
      }

      setDeapiCaption(nextPrompt);
      setDeapiBpm(String(nextBpm));
      setDeapiKeyscale(nextKeyscale);
      setDeapiDuration(String(nextDuration));
      setDeapiTimesignature(nextTimeSignature);
      setDeapiLyricsMode(nextLyricsMode);

      toast.success(
        nextLyricsMode === "lyrics"
          ? "The AI filled the prompt and switched to vocal mode. You provide the lyrics."
          : nextLyricsMode === "auto-lyrics"
            ? "The AI filled the prompt and switched to auto-lyrics mode."
          : "The AI filled the music prompt and main parameters."
      );
    } catch (err) {
      const message = err.message || "The music prompt enhancer failed.";
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
      throw new Error("The AI did not return lyrics for auto-lyrics mode.");
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
    const limits = getDeapiStepLimits(selectedDeapiModel, deapiModelSlug);
    setDeapiInferenceSteps((currentValue) =>
      clampDeapiCommittedValue(currentValue, {
        min: limits.min,
        max: limits.max,
        fallback: limits.min,
        integer: true,
      })
    );
  };

  const commitDeapiGuidanceScale = () => {
    const limits = getDeapiGuidanceLimits(selectedDeapiModel, deapiModelSlug);
    setDeapiGuidanceScale((currentValue) =>
      clampDeapiCommittedValue(currentValue, {
        min: limits.min,
        max: limits.max,
        fallback: limits.min,
      })
    );
  };

  const commitDeapiBpm = () => {
    const limits = getDeapiBpmLimits(selectedDeapiModel, deapiModelSlug);
    setDeapiBpm((currentValue) =>
      clampDeapiCommittedValue(currentValue, {
        min: limits.min,
        max: limits.max,
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
      toast.error("Only MP3, WAV, FLAC, OGG, or M4A reference audio can be uploaded.");
      return;
    }

    if (file.size > DEAPI_REFERENCE_AUDIO_MAX_BYTES) {
      toast.error("Reference audio can be at most 10 MB.");
      return;
    }

    try {
      const duration = await readAudioDuration(file);
      const minDuration = Number(selectedDeapiModel?.limits?.min_ref_audio_duration ?? 5);
      const maxDuration = Number(selectedDeapiModel?.limits?.max_ref_audio_duration ?? 60);

      if (Number.isFinite(duration) && (duration < minDuration || duration > maxDuration)) {
        toast.error(`Reference audio duration must be between ${minDuration}-${maxDuration} seconds.`);
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
      toast.error(err.message || "Reference audio could not be read.");
    }
  };

  const clearDeapiTtsReferenceAudio = () => {
    setDeapiTtsReferenceAudio(null);
  };

  const handleDeapiTtsReferenceAudioSelect = async (file) => {
    if (!file) {
      clearDeapiTtsReferenceAudio();
      return;
    }

    const fileExtension = getFileExtension(file.name);
    const hasSupportedMime = DEAPI_REFERENCE_AUDIO_MIME_TYPES.has(file.type);
    const hasSupportedExtension = DEAPI_REFERENCE_AUDIO_EXTENSIONS.has(fileExtension);

    if (!hasSupportedMime && !hasSupportedExtension) {
      toast.error("Only MP3, WAV, FLAC, OGG, or M4A reference audio can be uploaded.");
      return;
    }

    if (file.size > DEAPI_REFERENCE_AUDIO_MAX_BYTES) {
      toast.error("Reference audio can be at most 10 MB.");
      return;
    }

    try {
      const duration = await readAudioDuration(file);
      const minDuration = Number(effectiveDeapiTtsLimits.minRefAudioDuration ?? 5);
      const maxDuration = Number(effectiveDeapiTtsLimits.maxRefAudioDuration ?? 15);
      if (Number.isFinite(duration) && (duration < minDuration || duration > maxDuration)) {
        toast.error(`In voice clone mode, reference audio must be ${minDuration}-${maxDuration} seconds long.`);
        return;
      }

      setDeapiTtsReferenceAudio({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        duration,
      });
    } catch (err) {
      toast.error(err.message || "Reference audio could not be read.");
    }
  };

  // Common
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generationElapsed, setGenerationElapsed] = useState(0);
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
      setGenerationProgress(0);
      setGenerationStatus("");
      setGenerationElapsed(0);
      setCurrentJobId(null);
    }
  }, [jobs, currentJobId, isGenerating]);

  const [leftSecondaryOpen, setLeftSecondaryOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [offsets, setOffsets] = useState({ left: 320, right: 0 });

  const audioRef = useRef(null);
  const audioObjectUrlRef = useRef(null);
  const generationController = useRef(null);
  const color = selectedModel.color || "#10b981";

  const clearAudioObjectUrl = () => {
    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }
  };

  const setExternalAudioUrl = (nextAudioUrl) => {
    clearAudioObjectUrl();
    setAudioUrl(nextAudioUrl);
  };

  const fetchArchivedAudioBlobUrl = async (audioId) => {
    if (!audioId) throw new Error("Missing audio ID");
    const token = getIdToken ? await getIdToken() : null;
    const res = await fetch(`${API_BASE}/api/audio/history/${audioId}/file`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const payload = await res.json();
        message = payload.message || message;
      } catch {}
      throw new Error(message);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    clearAudioObjectUrl();
    audioObjectUrlRef.current = objectUrl;
    return objectUrl;
  };

  useEffect(() => {
    const jobId = sessionStorage.getItem(`ludusgen_open_job:${userId || 'guest'}`);
    if (!jobId) return;
    const job = jobs.find((item) => item.id === jobId && item.panelType === 'audio');
    if (!job) return;

    setSelectedJobId(jobId);

    if (job.status === 'running' || job.status === 'queued') {
      setCurrentJobId(jobId);
      setIsGenerating(true);
      setGenerationProgress(job.progress ?? 0);
      setGenerationStatus(job.status === 'queued' ? 'QUEUED' : 'PROCESSING');
      setGenerationElapsed(Math.max(0, Math.floor((Date.now() - (job.createdAt || Date.now())) / 1000)));
      return;
    }

    setCurrentJobId(null);
    setIsGenerating(false);
    setGenerationProgress(job.progress ?? 0);
    setGenerationStatus(job.status === 'done' ? 'DONE' : '');
    setGenerationElapsed(0);

    if ((job.status === 'done' || job.status === 'error') && !job.seenAt) {
      updateJob(jobId, { seenAt: Date.now() });
    }

    if (job.status === 'error') {
      setError(job.errorMessage || "Generation error");
      return;
    }

    if (job.resultAudio?.audioInfo) {
      setAudioInfo(job.resultAudio.audioInfo);
    }

    if (job.resultAudio?.audioUrl) {
      setExternalAudioUrl(job.resultAudio.audioUrl);
      return;
    }

    if (job.resultAudio?.audioId) {
      let cancelled = false;
      fetchArchivedAudioBlobUrl(job.resultAudio.audioId)
        .then((nextAudioUrl) => {
          if (!cancelled) setAudioUrl(nextAudioUrl);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message || "Archived audio could not be loaded.");
        });
      return () => {
        cancelled = true;
      };
    }
  }, [jobs, userId]);

  useEffect(() => () => clearAudioObjectUrl(), []);

  useEffect(() => { loadHistory(); }, [userId]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.onended = () => setIsPlaying(false);
  }, [audioUrl]);

  const loadHistory = async () => {
    if (!userId) {
      setHistory([]);
      return;
    }
    try {
      const token = getIdToken ? await getIdToken() : null;
      const res = await fetch(`${API_BASE}/api/audio/history`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      setHistory(Array.isArray(payload.items) ? payload.items : []);
    } catch (err) {
      console.warn("Audio archive load error:", err.message);
      setHistory([]);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  const canGenerateMiniMax = musicInstrumental
    ? !!musicPrompt.trim()
    : !!musicLyrics.trim() || (musicLyricsOptimizer && !!musicPrompt.trim());
  const canGenerateDeapi = !!deapiCaption.trim()
    && !!deapiModelSlug.trim()
    && hasValidDeapiCaptionLength
    && (deapiLyricsMode === "instrumental" || deapiLyricsMode === "auto-lyrics" || !!deapiLyrics.trim());
  const canGenerateDeapiTts = !!text.trim()
    && (
      effectiveDeapiTtsMode === "custom_voice"
        ? !!deapiTtsVoice.trim()
        : effectiveDeapiTtsMode === "voice_clone"
          ? !!deapiTtsReferenceAudio?.file
          : !!deapiTtsInstruct.trim()
    );
  const currentMusicContent = isDeapiMusic
    ? (deapiCaption || (deapiLyricsMode === "lyrics" ? effectiveDeapiLyrics : ""))
    : (musicPrompt || musicLyrics);

  const readAudioEventStream = async (res, jobId) => {
    const reader = res.body?.getReader();
    if (!reader) throw new Error("Generation stream is not readable.");

    const decoder = new TextDecoder();
    let buffer = "";

    const handleLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return null;

      const raw = trimmed.slice(5).trim();
      if (!raw || raw === "[DONE]") return null;

      let event;
      try {
        event = JSON.parse(raw);
      } catch {
        return null;
      }

      if (event.type === "status") {
        const progress = Math.max(0, Math.min(99, Math.round(Number(event.progress ?? 0))));
        const elapsed = Math.max(0, Math.round(Number(event.elapsed ?? 0)));
        setGenerationProgress(progress);
        setGenerationStatus(event.status ?? "");
        setGenerationElapsed(elapsed);
        updateJob(jobId, { progress, updatedAt: Date.now() });
        return null;
      }

      if (event.type === "done") {
        const elapsed = Math.max(0, Math.round(Number(event.elapsed ?? generationElapsed ?? 0)));
        setGenerationProgress(100);
        setGenerationStatus("DONE");
        setGenerationElapsed(elapsed);
        updateJob(jobId, { progress: 100, updatedAt: Date.now() });
        return { success: true, ...event };
      }

      if (event.type === "error") {
        throw new Error(event.message || "Generation error");
      }

      return null;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const finalEvent = handleLine(line);
        if (finalEvent) return finalEvent;
      }
    }

    if (buffer) {
      const finalEvent = handleLine(buffer);
      if (finalEvent) return finalEvent;
    }

    throw new Error("The generation stream ended without a result.");
  };

  const handleGenerate = async () => {
    const canGenerateMusic = isDeapiMusic ? canGenerateDeapi : canGenerateMiniMax;
    const canGenerateSpeech = isDeapiTTS ? canGenerateDeapiTts : !!text.trim();
    const content = isTTS ? text : currentMusicContent;
    if ((isTTS ? !canGenerateSpeech : !canGenerateMusic) || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setExternalAudioUrl(null);
    setAudioInfo(null);
    setIsPlaying(false);
    setGenerationProgress(0);
    setGenerationStatus("");
    setGenerationElapsed(0);
    closeMobileStudioPanel();
    const jobId = startJob(isTTS ? 'audio' : 'music', (content || 'Audio generation').slice(0, 48), 'audio');
    sessionStorage.setItem(`ludusgen_open_job:${userId || 'guest'}`, jobId);
    setSelectedJobId(jobId);
    setCurrentJobId(jobId);
    onActiveJobChange?.({ panelType: 'audio', jobId });
    const controller = new AbortController();
    generationController.current = controller;
    registerCancelHandler(jobId, () => controller.abort());
    updateJob(jobId, { progress: 0, updatedAt: Date.now() });

    try {
      const token = getIdToken ? await getIdToken() : null;
      const endpoint = isTTS ? `${API_BASE}/api/generate-tts` : `${API_BASE}/api/generate-music`;
      let resolvedDeapiLyrics = effectiveDeapiLyrics;

      if (!isTTS && isDeapiMusic && deapiLyricsMode === "auto-lyrics") {
        setGenerationStatus("LYRICS");
        setGenerationProgress(3);
        updateJob(jobId, { progress: 3, updatedAt: Date.now() });
        resolvedDeapiLyrics = await generateDeapiAutoLyrics();
        setDeapiLyrics(resolvedDeapiLyrics);
      }

      let body;
      let headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      if (isTTS) {
        if (isDeapiTTS) {
          const formData = new FormData();
          const deapiTtsPayload = {
            apiId: selectedModel.apiId,
            provider: selectedModel.provider,
            model: effectiveDeapiTtsModelSlug,
            text,
            mode: effectiveDeapiTtsMode,
            voice: effectiveDeapiTtsMode === "custom_voice" ? deapiTtsVoice.trim() : "",
            lang: deapiTtsLang,
            speed: deapiTtsSpeed,
            format: deapiTtsFormat,
            sample_rate: deapiTtsSampleRate,
            ref_text: effectiveDeapiTtsMode === "voice_clone" ? deapiTtsRefText.trim() : "",
            instruct: effectiveDeapiTtsMode === "voice_design" ? deapiTtsInstruct.trim() : "",
            jobId,
          };
          Object.entries(deapiTtsPayload).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "") return;
            formData.append(key, String(value));
          });
          if (effectiveDeapiTtsMode === "voice_clone" && deapiTtsReferenceAudio?.file) {
            formData.append("ref_audio", deapiTtsReferenceAudio.file, deapiTtsReferenceAudio.file.name);
          }
          body = formData;
        } else if (isNvidiaRiva) {
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
        if (!isDeapiTTS) {
          headers["Content-Type"] = "application/json";
        }
      } else {
        if (isDeapiMusic) {
          const formData = new FormData();
          const stepLimits = getDeapiStepLimits(selectedDeapiModel, deapiModelSlug);
          const guidanceLimits = getDeapiGuidanceLimits(selectedDeapiModel, deapiModelSlug);
          const bpmLimits = getDeapiBpmLimits(selectedDeapiModel, deapiModelSlug);
          const safeInferenceSteps = clampDeapiCommittedValue(deapiInferenceSteps, {
            min: stepLimits.min,
            max: stepLimits.max,
            fallback: stepLimits.min,
            integer: true,
          });
          const safeGuidanceScale = clampDeapiCommittedValue(deapiGuidanceScale, {
            min: guidanceLimits.min,
            max: guidanceLimits.max,
            fallback: guidanceLimits.min,
          });
          const safeBpm = clampDeapiCommittedValue(deapiBpm, {
            min: bpmLimits.min,
            max: bpmLimits.max,
            fallback: "",
            integer: true,
            allowEmpty: true,
          });
          const seedText = String(deapiSeed ?? "").trim();
          const parsedSeed = Number(seedText);
          const safeSeed = seedText === "" || !Number.isFinite(parsedSeed)
            ? -1
            : Math.trunc(parsedSeed);
          const deapiPayload = {
            apiId: selectedModel.apiId,
            provider: selectedModel.provider,
            model: deapiModelSlug,
            caption: deapiCaption,
            lyrics: resolvedDeapiLyrics,
            lyrics_mode: deapiLyricsMode,
            duration: deapiDuration,
            inference_steps: safeInferenceSteps,
            guidance_scale: safeGuidanceScale,
            seed: safeSeed,
            format: deapiFormat.trim(),
            bpm: safeBpm === "" ? null : Number(safeBpm),
            keyscale: deapiKeyscale.trim() || null,
            timesignature: deapiTimesignature ? Number(deapiTimesignature) : null,
            vocal_language: "unknown",
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
        body: (isDeapiMusic || isDeapiTTS) ? body : JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const j = await res.json(); errMsg = j.message || errMsg; } catch {}
        throw new Error(errMsg);
      }
      const contentType = res.headers.get("content-type") || "";
      const data = (isDeapiMusic || isDeapiTTS) && contentType.includes("text/event-stream")
        ? await readAudioEventStream(res, jobId)
        : await res.json();
      if (controller.signal.aborted) return;
      if (!data.success) throw new Error(data.message);

      const playbackAudioUrl = data.audioId
        ? await fetchArchivedAudioBlobUrl(data.audioId)
        : data.audioUrl;
      if (!playbackAudioUrl) throw new Error("No playable audio was returned.");
      setAudioUrl(playbackAudioUrl);
      const nextAudioInfo = isTTS
        ? {
            fileFormat: data.fileFormat || (isDeapiTTS ? deapiTtsFormat : isNvidiaRiva ? "wav" : audioFormat),
            sampleRate: data.sampleRate || (isDeapiTTS ? deapiTtsSampleRate : isNvidiaRiva ? 22050 : null),
            bitrate: null,
            outputFormat: data.outputFormat || (isDeapiTTS ? "url" : "data"),
            stream: false,
            audioId: data.audioId || null,
          }
        : {
            fileFormat: data.fileFormat || (isDeapiMusic ? deapiFormat : musicFileFormat),
            sampleRate: data.sampleRate || (isDeapiMusic ? null : musicSampleRate),
            bitrate: data.bitrate || (isDeapiMusic ? null : musicBitrate),
            outputFormat: data.outputFormat || (isDeapiMusic ? "url" : (musicStream ? "hex" : musicOutputFormat)),
            stream: Boolean(data.stream ?? (isDeapiMusic ? false : musicStream)),
            audioId: data.audioId || null,
          };
      setAudioInfo(nextAudioInfo);
      const safeAudioUrl = data.audioUrl && !String(data.audioUrl).startsWith("data:") ? data.audioUrl : null;
      finishAudioJob(jobId, {
        resultAudio: {
          audioUrl: safeAudioUrl,
          audioId: data.audioId || null,
          audioInfo: nextAudioInfo,
        },
      });

      if (userId) {
        await loadHistory();
      }
    } catch (err) {
      setError(err.message || "Generation error");
      failAudioJob(jobId, err.message || 'Generation error');
    } finally {
      unregisterCancelHandler(jobId);
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
                label: 'CREATE',
                icon: <Zap className="w-5 h-5" />,
                isActive: view === 'forge',
                onClick: () => { setView('forge'); setLeftSecondaryOpen(true); },
              },
              {
                id: 'history',
                label: 'ARCHIVE',
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
                  setExternalAudioUrl(null);
                  setAudioInfo(null);
                  setIsPlaying(false);
                  onModelChange?.(model);
                }}
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
                text={text} setText={setText}
                selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice}
                speed={speed} setSpeed={setSpeed}
                deapiTtsVariant={deapiTtsVariant} setDeapiTtsVariant={setDeapiTtsVariant}
                deapiTtsMode={deapiTtsMode} setDeapiTtsMode={setDeapiTtsMode}
                deapiTtsVoice={deapiTtsVoice} setDeapiTtsVoice={setDeapiTtsVoice}
                deapiTtsLang={deapiTtsLang} setDeapiTtsLang={setDeapiTtsLang}
                deapiTtsSpeed={deapiTtsSpeed} setDeapiTtsSpeed={setDeapiTtsSpeed}
                deapiTtsFormat={deapiTtsFormat} setDeapiTtsFormat={setDeapiTtsFormat}
                deapiTtsSampleRate={deapiTtsSampleRate} setDeapiTtsSampleRate={setDeapiTtsSampleRate}
                deapiTtsRefText={deapiTtsRefText} setDeapiTtsRefText={setDeapiTtsRefText}
                deapiTtsInstruct={deapiTtsInstruct} setDeapiTtsInstruct={setDeapiTtsInstruct}
                deapiTtsReferenceAudio={deapiTtsReferenceAudio}
                onDeapiTtsReferenceAudioSelect={handleDeapiTtsReferenceAudioSelect}
                onDeapiTtsReferenceAudioClear={clearDeapiTtsReferenceAudio}
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
                deapiModelSlug={deapiModelSlug}
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
          generationProgress={generationProgress}
          generationStatus={generationStatus}
          generationElapsed={generationElapsed}
          audioUrl={audioUrl}
          audioInfo={audioInfo}
          error={error}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          color={color}
          history={history}
          onHistorySelect={async (item, options = {}) => {
            try {
              setError(null);
              audioRef.current?.pause?.();
              setIsPlaying(false);
              const nextAudioUrl = item.audioId && item.storage === 'b2'
                ? await fetchArchivedAudioBlobUrl(item.audioId)
                : item.audioUrl;

              if (!nextAudioUrl) throw new Error("Archived audio could not be loaded.");
              if (item.audioId && item.storage === 'b2') {
                setAudioUrl(nextAudioUrl);
              } else {
                setExternalAudioUrl(nextAudioUrl);
              }
              const nextAudioInfo = {
                fileFormat: item.fileFormat || item.format || (item.type === 'tts' && item.voiceName ? 'wav' : 'mp3'),
                sampleRate: item.sampleRate || null,
                bitrate: item.bitrate || null,
                outputFormat: item.outputFormat || null,
                stream: Boolean(item.stream),
                audioId: item.audioId || null,
              };
              setAudioInfo(nextAudioInfo);
              if (!options.keepHistory) setView('forge');
              return { audioUrl: nextAudioUrl, audioInfo: nextAudioInfo };
            } catch (err) {
              console.warn("Archived audio load error:", err.message);
              setError(err.message || "Archived audio could not be loaded.");
              if (!options.keepHistory) setView('forge');
              throw err;
            }
          }}
          getIdToken={getIdToken}
        />
        {audioUrl && <audio ref={audioRef} src={audioUrl} />}
      </div>
    </StudioLayout>
  );
}
