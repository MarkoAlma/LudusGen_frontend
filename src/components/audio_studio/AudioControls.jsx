import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Music,
  Zap,
  Settings2,
  Sparkles,
  Wand2,
  Loader2,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  Globe,
  Volume2,
  Activity,
  Smile,
  Upload,
  X,
} from 'lucide-react';
import { ALL_MODELS, getAudioSpeechModels } from '../../ai_components/models';

const MODEL_LIMIT_LABEL = "Global limit";

const TTS_VOICES = [
  { id: "alloy", label: "Alloy", desc: "Neutral, balanced" },
  { id: "echo", label: "Echo", desc: "Melancholic, deep" },
  { id: "fable", label: "Fable", desc: "Expressive, British accent" },
  { id: "onyx", label: "Onyx", desc: "Deep, authoritative" },
  { id: "nova", label: "Nova", desc: "Energetic, friendly" },
  { id: "shimmer", label: "Shimmer", desc: "Soft, pleasant" },
];

const MINIMAX_SAMPLE_RATES = [16000, 24000, 32000, 44100];
const MINIMAX_BITRATES = [32000, 64000, 128000, 256000];
const MINIMAX_FILE_FORMATS = ["mp3", "wav", "pcm"];
const DEAPI_FILE_FORMATS = [
  { id: "mp3", label: "MP3" },
  { id: "wav", label: "WAV" },
  { id: "flac", label: "FLAC" },
];
const DEAPI_TTS_MODES = [
  { id: "custom_voice", label: "Preset", desc: "Ready voice" },
  { id: "voice_clone", label: "Clone", desc: "Reference" },
  { id: "voice_design", label: "Design", desc: "Description" },
];
const DEAPI_TTS_LANGUAGES = [
  { id: "en", label: "EN" },
  { id: "en-us", label: "EN-US" },
  { id: "en-gb", label: "EN-GB" },
  { id: "hu", label: "HU" },
  { id: "de", label: "DE" },
  { id: "es", label: "ES" },
  { id: "fr", label: "FR" },
  { id: "it", label: "IT" },
  { id: "ja", label: "JA" },
  { id: "zh", label: "ZH" },
];
const DEAPI_TTS_SAMPLE_RATES = [
  { id: "16000", label: "16 kHz" },
  { id: "22050", label: "22.05 kHz" },
  { id: "24000", label: "24 kHz" },
  { id: "44100", label: "44.1 kHz" },
  { id: "48000", label: "48 kHz" },
];
const DEAPI_TTS_VOICES = [
  { id: "af_sky", label: "AF Sky", desc: "Kokoro" },
  { id: "af_heart", label: "AF Heart", desc: "Kokoro" },
  { id: "am_adam", label: "AM Adam", desc: "Kokoro" },
  { id: "female", label: "Female", desc: "Chatterbox" },
  { id: "male", label: "Male", desc: "Chatterbox" },
  { id: "Vivian", label: "Vivian", desc: "Qwen3" },
  { id: "Serena", label: "Serena", desc: "Qwen3" },
  { id: "Dylan", label: "Dylan", desc: "Qwen3" },
];
const MINIMAX_OUTPUT_FORMATS = [
  { id: "url", label: "URL", desc: "24-hour link" },
  { id: "hex", label: "HEX", desc: "Embedded data" },
];
const DEAPI_TIME_SIGNATURES = [
  { id: "", label: "Auto", description: "not set" },
  { id: "2", label: "2", description: "time signature" },
  { id: "3", label: "3", description: "time signature" },
  { id: "4", label: "4", description: "time signature" },
  { id: "6", label: "6", description: "time signature" },
];
const normalizeDeapiModelSlug = (slug) => String(slug || "").trim().toLowerCase();
const DEAPI_TURBO_MODEL_SLUGS = new Set(["acestep_1_5_xl_turbo_int8"]);
const isDeapiTurboInt8ModelSlug = (slug) => {
  const normalizedSlug = normalizeDeapiModelSlug(slug);
  return DEAPI_TURBO_MODEL_SLUGS.has(normalizedSlug) || normalizedSlug.includes("turbo");
};
const getDeapiLimitNumber = (limits, key, fallback) => {
  const value = Number(limits?.[key]);
  return Number.isFinite(value) ? value : fallback;
};

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

const formatSampleRate = (value) => {
  const kiloHertz = value / 1000;
  return `${Number.isInteger(kiloHertz) ? kiloHertz : kiloHertz.toFixed(1)} kHz`;
};

const formatBitrate = (value) => `${Math.round(value / 1000)} kbps`;
const formatFileSize = (value) => {
  if (!value) return null;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};
const formatDurationLabel = (value) => {
  if (!Number.isFinite(Number(value))) return null;
  const totalSeconds = Math.max(0, Math.round(Number(value)));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (!minutes) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

function SectionShell({ color, eyebrow, title, subtitle, icon: Icon, children, compact = false }) {
  const shellClassName = compact
    ? "relative rounded-[1.25rem] border border-white/6 bg-white/[0.025] p-3.5 shadow-[0_14px_28px_rgba(0,0,0,0.18)]"
    : "relative rounded-[1.75rem] border border-white/6 bg-white/[0.025] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.22)]";
  const headerClassName = compact ? "mb-3 flex items-start justify-between gap-3" : "mb-5 flex items-start justify-between gap-4";
  const eyebrowClassName = compact
    ? "text-[8px] font-black uppercase tracking-[0.16em] text-zinc-600 italic"
    : "text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic";
  const titleClassName = compact
    ? "mt-1 text-[11px] font-black uppercase tracking-[0.08em] text-white"
    : "mt-2 text-[13px] font-black uppercase tracking-[0.16em] text-white";
  const subtitleClassName = compact
    ? "mt-1 break-words text-[9px] font-semibold uppercase tracking-[0.04em] leading-snug text-zinc-500"
    : "mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500";
  const iconClassName = compact
    ? "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/8"
    : "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/8";

  return (
    <section className={shellClassName}>
      <div
        className="pointer-events-none absolute inset-x-6 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }}
      />
      <div className={headerClassName}>
        <div className="min-w-0">
          <p className={eyebrowClassName}>{eyebrow}</p>
          <h3 className={titleClassName}>{title}</h3>
          {subtitle ? (
            <p className={subtitleClassName}>{subtitle}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={iconClassName}
            style={{ backgroundColor: `${color}14`, color }}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className={compact ? "space-y-3" : "space-y-5"}>{children}</div>
    </section>
  );
}

function TextAreaField({ label, value, onChange, placeholder, hint, rows = 4, disabled = false, compact = false }) {
  const wrapperClassName = compact ? "min-w-0 space-y-2" : "min-w-0 space-y-3";
  const labelClassName = compact
    ? "block break-words px-1 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-600 italic leading-snug"
    : "block break-words px-1 text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic leading-relaxed";
  const textareaSizeClassName = compact
    ? "rounded-[1rem] p-3 text-[12px] leading-snug"
    : "rounded-[1.25rem] p-4 text-[13px] leading-relaxed";
  const hintClassName = compact
    ? "break-words px-1 text-[9px] font-semibold uppercase tracking-[0.04em] leading-snug text-zinc-500"
    : "break-words px-1 text-[10px] font-bold uppercase tracking-[0.14em] leading-relaxed text-zinc-600";

  return (
    <div className={wrapperClassName}>
      <label className={labelClassName}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full border transition-all resize-none focus:outline-none ${textareaSizeClassName} ${disabled
          ? 'cursor-not-allowed border-white/5 bg-white/[0.015] text-zinc-600 placeholder:text-zinc-800'
          : 'border-white/6 bg-white/[0.02] text-zinc-200 placeholder:text-zinc-800 focus:border-white/12'
          }`}
      />
      {hint ? (
        <p className={hintClassName}>{hint}</p>
      ) : null}
    </div>
  );
}

function TextInputField({
  label,
  value,
  onChange,
  onCommit,
  placeholder,
  hint,
  type = "text",
  inputMode,
  min,
  max,
  step,
  compact = false,
  wrapperClassName = "",
  showLimit = true,
}) {
  const hasMin = min !== undefined && min !== null && min !== "";
  const hasMax = max !== undefined && max !== null && max !== "";
  const limitNote = showLimit && hasMin && hasMax
    ? Number(min) === Number(max)
      ? `Limit: fixen ${min}`
      : `Limit: ${min}-${max}`
    : null;
  const baseWrapperClassName = compact ? "min-w-0 space-y-1.5" : "min-w-0 space-y-3";
  const labelClassName = compact
    ? "block truncate px-1 text-[8px] font-black uppercase tracking-[0.12em] text-zinc-600 italic leading-snug"
    : "block break-words px-1 text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic leading-relaxed";
  const inputClassName = compact
    ? "min-w-0 w-full rounded-[0.9rem] border border-white/6 bg-white/[0.02] px-3 py-2 text-[11px] font-bold text-zinc-200 placeholder:text-zinc-700 transition-all focus:outline-none focus:border-white/12"
    : "min-w-0 w-full rounded-[1.1rem] border border-white/6 bg-white/[0.02] px-4 py-3 text-[12px] font-bold text-zinc-200 placeholder:text-zinc-700 transition-all focus:outline-none focus:border-white/12";
  const helperClassName = compact
    ? "break-words px-1 text-[9px] font-semibold uppercase tracking-[0.04em] leading-snug text-zinc-500"
    : "break-words px-1 text-[10px] font-bold uppercase tracking-[0.12em] leading-relaxed text-zinc-600";

  return (
    <div className={`${baseWrapperClassName} ${wrapperClassName}`}>
      <label className={labelClassName}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onCommit?.()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onCommit?.();
            event.currentTarget.blur();
          }
        }}
        placeholder={placeholder}
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        className={inputClassName}
      />
      {limitNote ? (
        <p className={compact ? "break-words px-1 text-[9px] font-semibold uppercase tracking-[0.04em] leading-snug text-zinc-500" : "break-words px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 leading-relaxed"}>{limitNote}</p>
      ) : null}
      {hint ? (
        <p className={helperClassName}>{hint}</p>
      ) : null}
    </div>
  );
}

function ToggleCard({ color, label, description, active, onClick, icon: Icon, disabled = false }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`min-w-0 w-full rounded-[1.35rem] border p-4 text-left transition-all duration-300 ${disabled
        ? 'cursor-not-allowed border-white/5 bg-white/[0.015] opacity-45'
        : active
          ? 'shadow-[0_12px_30px_rgba(0,0,0,0.18)]'
          : 'border-white/6 bg-white/[0.018] hover:border-white/12 hover:bg-white/[0.03]'
        }`}
      style={active ? { borderColor: `${color}55`, backgroundColor: `${color}12` } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/8"
          style={active ? { backgroundColor: `${color}18`, color } : { backgroundColor: 'rgba(255,255,255,0.03)', color: '#71717a' }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div
          className="relative mt-1 h-5 w-9 flex-shrink-0 rounded-full transition-colors"
          style={{ backgroundColor: active ? color : 'rgba(255,255,255,0.06)' }}
        >
          <motion.div
            animate={{ x: active ? 18 : 3 }}
            transition={{ type: 'spring', damping: 20, stiffness: 320 }}
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-md"
          />
        </div>
      </div>
      <div className="mt-4 min-w-0 space-y-2">
        <p className="break-words text-[10px] font-black uppercase tracking-[0.18em] leading-[1.45] text-white">
          {label}
        </p>
        <p className="break-words text-[9px] font-bold uppercase tracking-[0.1em] leading-[1.55] text-zinc-500">
          {description}
        </p>
      </div>
    </button>
  );
}

function OptionCard({ color, label, description, active, onClick, disabled = false, compact = false }) {
  const buttonClassName = compact
    ? `min-w-0 rounded-[0.95rem] border px-1.5 py-2 text-center transition-all duration-300 ${disabled
      ? 'cursor-not-allowed border-white/5 bg-white/[0.015] opacity-40'
      : active
        ? 'shadow-[0_10px_22px_rgba(0,0,0,0.16)]'
        : 'border-white/6 bg-white/[0.018] hover:border-white/12 hover:bg-white/[0.03]'
    }`
    : `min-w-0 rounded-[1.2rem] border px-3 py-3 text-center transition-all duration-300 ${disabled
      ? 'cursor-not-allowed border-white/5 bg-white/[0.015] opacity-40'
      : active
        ? 'shadow-[0_12px_30px_rgba(0,0,0,0.18)]'
        : 'border-white/6 bg-white/[0.018] hover:border-white/12 hover:bg-white/[0.03]'
    }`;
  const contentClassName = compact
    ? "flex min-h-[2.7rem] flex-col items-center justify-center gap-0.5"
    : "flex min-h-[4.75rem] flex-col items-center justify-center gap-1";
  const labelClassName = compact
    ? `break-words text-[8px] font-black uppercase tracking-[0.015em] leading-tight ${active ? 'text-white' : 'text-zinc-200'}`
    : `break-words text-[11px] font-black uppercase tracking-[0.16em] leading-tight ${active ? 'text-white' : 'text-zinc-200'}`;
  const descriptionClassName = compact
    ? "break-words text-[8px] font-semibold uppercase tracking-[0.02em] leading-tight text-zinc-500"
    : "break-words text-[8px] font-bold uppercase tracking-[0.08em] leading-[1.45] text-zinc-500";

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={buttonClassName}
      style={active ? { borderColor: `${color}55`, backgroundColor: `${color}12` } : undefined}
    >
      <div className={contentClassName}>
        <div className={labelClassName}>
          {label}
        </div>
        {description ? (
          <div className={descriptionClassName}>{description}</div>
        ) : null}
      </div>
    </button>
  );
}

export default function AudioControls({
  selectedModel,
  onModelChange,
  isGenerating,
  onGenerate,

  text,
  setText,
  selectedVoice,
  setSelectedVoice,
  speed,
  setSpeed,
  deapiTtsVariant,
  setDeapiTtsVariant,
  deapiTtsMode,
  setDeapiTtsMode,
  deapiTtsVoice,
  setDeapiTtsVoice,
  deapiTtsLang,
  setDeapiTtsLang,
  deapiTtsSpeed,
  setDeapiTtsSpeed,
  deapiTtsFormat,
  setDeapiTtsFormat,
  deapiTtsSampleRate,
  setDeapiTtsSampleRate,
  deapiTtsRefText,
  setDeapiTtsRefText,
  deapiTtsInstruct,
  setDeapiTtsInstruct,
  deapiTtsReferenceAudio,
  onDeapiTtsReferenceAudioSelect,
  onDeapiTtsReferenceAudioClear,

  rivaLang,
  setRivaLang,
  rivaVoices,
  rivaVoiceName,
  setRivaVoiceName,
  rivaEmotion,
  setRivaEmotion,
  hasEmotions,

  musicPrompt,
  setMusicPrompt,
  musicLyrics,
  setMusicLyrics,
  musicLyricsOptimizer,
  setMusicLyricsOptimizer,
  musicInstrumental,
  setMusicInstrumental,
  musicStream,
  setMusicStream,
  musicOutputFormat,
  setMusicOutputFormat,
  musicSampleRate,
  setMusicSampleRate,
  musicBitrate,
  setMusicBitrate,
  musicFileFormat,
  setMusicFileFormat,

  deapiModels,
  deapiModelSlug,
  deapiCaption,
  setDeapiCaption,
  deapiEnhancingPrompt,
  deapiEnhancerError,
  onDeapiEnhancePrompt,
  onDeapiResetDefaults,
  deapiLyricsMode,
  setDeapiLyricsMode,
  deapiLyrics,
  setDeapiLyrics,
  deapiDuration,
  setDeapiDuration,
  onCommitDeapiDuration,
  deapiInferenceSteps,
  setDeapiInferenceSteps,
  onCommitDeapiInferenceSteps,
  deapiGuidanceScale,
  setDeapiGuidanceScale,
  onCommitDeapiGuidanceScale,
  deapiSeed,
  setDeapiSeed,
  deapiFormat,
  setDeapiFormat,
  deapiBpm,
  setDeapiBpm,
  onCommitDeapiBpm,
  deapiKeyscale,
  setDeapiKeyscale,
  deapiTimesignature,
  setDeapiTimesignature,
  deapiReferenceAudio,
  onDeapiReferenceAudioSelect,
  onDeapiReferenceAudioClear,
}) {
  const dropdownRef = useRef(null);
  const referenceAudioInputRef = useRef(null);
  const ttsReferenceAudioInputRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const color = selectedModel.color || "#10b981";

  const isTTS = selectedModel.audioType === "tts";
  const isNvidiaRiva = selectedModel.provider === "nvidia-riva";
  const isDeapiTTS = selectedModel.audioType === "tts" && selectedModel.provider === "deapi";
  const isDeapiMusic = selectedModel.audioType === "music" && selectedModel.provider === "deapi";
  const deapiTtsVariants = Array.isArray(selectedModel.deapiTtsVariants) ? selectedModel.deapiTtsVariants : [];
  const selectedDeapiTtsVariant = deapiTtsVariants.find((variant) => variant.id === deapiTtsVariant) || deapiTtsVariants[0] || null;
  const effectiveDeapiTtsMode = selectedDeapiTtsVariant?.mode || deapiTtsMode;
  const effectiveDeapiTtsLimits = selectedDeapiTtsVariant?.limits || selectedModel.deapiTtsLimits || {};
  const deapiTtsLanguageOptions = selectedDeapiTtsVariant?.languages || selectedModel.deapiTtsLanguages || DEAPI_TTS_LANGUAGES;
  const deapiTtsVoiceOptions = selectedDeapiTtsVariant?.voices || selectedModel.deapiTtsVoices || DEAPI_TTS_VOICES;
  const deapiTtsAvailableModeIds = Array.isArray(selectedModel.deapiTtsModes) && selectedModel.deapiTtsModes.length > 0
    ? selectedModel.deapiTtsModes
    : ["custom_voice"];
  const deapiTtsModeOptions = DEAPI_TTS_MODES.filter((option) => deapiTtsAvailableModeIds.includes(option.id));
  const showDeapiTtsModeSelector = deapiTtsVariants.length > 1 || deapiTtsModeOptions.length > 1;
  const showDeapiTtsVoiceSelector = effectiveDeapiTtsMode === "custom_voice" && deapiTtsVoiceOptions.length > 1;
  const deapiTtsRefDurationMin = Number(effectiveDeapiTtsLimits.minRefAudioDuration ?? 5);
  const deapiTtsRefDurationMax = Number(effectiveDeapiTtsLimits.maxRefAudioDuration ?? 15);
  const selectedDeapiModel = deapiModels.find((model) => model.slug === deapiModelSlug) || null;
  const deapiLimits = selectedDeapiModel?.limits || {};
  const deapiCaptionMin = Number.isFinite(Number(deapiLimits.min_caption)) ? Number(deapiLimits.min_caption) : 3;
  const deapiCaptionMax = Number.isFinite(Number(deapiLimits.max_caption)) ? Number(deapiLimits.max_caption) : 300;
  const deapiDurationMin = Number.isFinite(Number(deapiLimits.min_duration)) ? Number(deapiLimits.min_duration) : 10;
  const deapiDurationMax = Number.isFinite(Number(deapiLimits.max_duration)) ? Number(deapiLimits.max_duration) : 600;
  const isTurboInt8DeapiModel = isDeapiTurboInt8ModelSlug(deapiModelSlug);
  const deapiStepsMin = isTurboInt8DeapiModel ? 8 : getDeapiLimitNumber(deapiLimits, "min_steps", 1);
  const deapiStepsMax = isTurboInt8DeapiModel ? 8 : getDeapiLimitNumber(deapiLimits, "max_steps", 100);
  const deapiGuidanceMin = isTurboInt8DeapiModel ? 1 : getDeapiLimitNumber(deapiLimits, "min_guidance", 0);
  const deapiGuidanceMax = isTurboInt8DeapiModel ? 1 : getDeapiLimitNumber(deapiLimits, "max_guidance", 20);
  const rawDeapiBpmMin = getDeapiLimitNumber(deapiLimits, "min_bpm", 30);
  const rawDeapiBpmMax = getDeapiLimitNumber(deapiLimits, "max_bpm", 300);
  const deapiBpmMax = isTurboInt8DeapiModel ? Math.min(rawDeapiBpmMax, 200) : rawDeapiBpmMax;
  const deapiBpmMin = Math.min(rawDeapiBpmMin, deapiBpmMax);
  const deapiReferenceDurationMin = Number.isFinite(Number(deapiLimits.min_ref_audio_duration)) ? Number(deapiLimits.min_ref_audio_duration) : 5;
  const deapiReferenceDurationMax = Number.isFinite(Number(deapiLimits.max_ref_audio_duration)) ? Number(deapiLimits.max_ref_audio_duration) : 60;
  const deapiCaptionLength = deapiCaption.trim().length;
  const hasValidDeapiCaptionLength = deapiCaptionLength >= deapiCaptionMin && deapiCaptionLength <= deapiCaptionMax;
  const deapiEnhanceDisabled = !deapiCaption.trim() || !hasValidDeapiCaptionLength || deapiEnhancingPrompt || isGenerating;
  const deapiResetDisabled = deapiEnhancingPrompt || isGenerating;
  const deapiTimeSignatureIndex = Math.max(0, DEAPI_TIME_SIGNATURES.findIndex((signature) => signature.id === deapiTimesignature));
  const deapiSelectedTimeSignature = DEAPI_TIME_SIGNATURES[deapiTimeSignatureIndex] || DEAPI_TIME_SIGNATURES[0];

  const speechModels = getAudioSpeechModels();
  const musicModels = ALL_MODELS.filter((model) => model.panelType === 'audio' && model.audioType === 'music');
  const availableModels = isTTS ? speechModels : musicModels;

  const canGenerateMiniMax = musicInstrumental
    ? !!musicPrompt.trim()
    : !!musicLyrics.trim() || (musicLyricsOptimizer && !!musicPrompt.trim());
  const canGenerateDeapi = !!deapiCaption.trim()
    && !!deapiModelSlug.trim()
    && hasValidDeapiCaptionLength
    && (deapiLyricsMode === "instrumental" || deapiLyricsMode === "auto-lyrics" || !!deapiLyrics.trim());
  const canGenerateMusic = isDeapiMusic ? canGenerateDeapi : canGenerateMiniMax;
  const canGenerateDeapiTts = !!text.trim()
    && (
      effectiveDeapiTtsMode === "custom_voice"
        ? !!String(deapiTtsVoice || "").trim()
        : effectiveDeapiTtsMode === "voice_clone"
          ? !!deapiTtsReferenceAudio
          : !!String(deapiTtsInstruct || "").trim()
    );
  const canGenerate = isTTS ? (isDeapiTTS ? canGenerateDeapiTts : !!text.trim()) : canGenerateMusic;

  useEffect(() => {
    if (!dropdownOpen) return undefined;

    const handler = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const Select = ({ label, options, value, onChange, icon: Icon, compact = false }) => {
    const selectRef = useRef(null);
    const [open, setOpen] = useState(false);

    const getOptionValue = (option) => String(
      typeof option === 'string'
        ? option
        : option.code ?? option.id ?? option.value ?? option.slug ?? ''
    );
    const getOptionLabel = (option) => String(
      typeof option === 'string'
        ? option
        : option.label ?? option.name ?? option.code ?? option.id ?? option.value ?? ''
    );
    const getOptionDescription = (option) => (
      typeof option === 'string'
        ? ''
        : option.desc || option.description || option.provider || ''
    );
    const selectedOption = options.find((option) => getOptionValue(option) === String(value));
    const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : String(value || '');

    useEffect(() => {
      if (!open) return undefined;

      const handlePointerDown = (event) => {
        if (selectRef.current && !selectRef.current.contains(event.target)) {
          setOpen(false);
        }
      };
      const handleKeyDown = (event) => {
        if (event.key === 'Escape') setOpen(false);
      };

      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handlePointerDown);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [open]);

    return (
      <div ref={selectRef} className={compact ? "space-y-1.5" : "space-y-3"}>
        <div className="flex items-center gap-2 px-1">
          {Icon ? <Icon className="h-3 w-3 text-zinc-600" /> : null}
          <label className={compact ? "truncate text-[8px] font-black uppercase tracking-[0.12em] text-zinc-600 italic" : "text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic"}>{label}</label>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className={`flex w-full min-w-0 items-center gap-2 border border-white/8 bg-white/[0.04] text-left transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06] focus:outline-none focus:border-white/15 ${compact
              ? 'min-h-10 rounded-xl py-2 pl-2 pr-3'
              : 'min-h-12 rounded-[1.1rem] py-2.5 pl-2.5 pr-4'
              }`}
          >
            {Icon ? (
              <span
                className={`flex shrink-0 items-center justify-center rounded-lg ${compact ? 'h-6 w-6' : 'h-7 w-7'}`}
                style={{ backgroundColor: `${color}18`, color }}
              >
                <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              </span>
            ) : null}
            <span className={`min-w-0 flex-1 truncate font-black text-white ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
              {selectedLabel}
            </span>
            <ChevronDown
              className={`shrink-0 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}
            />
          </button>

          <AnimatePresence>
            {open ? (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#0d0d14]/98 py-1 shadow-2xl backdrop-blur-xl"
              >
                {options.map((option) => {
                  const optionValue = getOptionValue(option);
                  const optionLabel = getOptionLabel(option);
                  const optionDescription = getOptionDescription(option);
                  const isActive = optionValue === String(value);

                  return (
                    <button
                      key={optionValue || optionLabel}
                      type="button"
                      onClick={() => {
                        onChange(optionValue);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-all ${isActive ? 'bg-white/[0.05]' : 'hover:bg-white/[0.025]'
                        }`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: isActive ? color : 'rgba(255,255,255,0.16)' }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-bold text-white">{optionLabel}</span>
                        {optionDescription ? (
                          <span className="block truncate text-[8px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                            {optionDescription}
                          </span>
                        ) : null}
                      </span>
                      {isActive ? (
                        <span className="shrink-0 text-[8px] font-black uppercase" style={{ color }}>Active</span>
                      ) : null}
                    </button>
                  );
                })}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-white/5 bg-[#0a0618]/30 backdrop-blur-[60px] shadow-[20px_0_40px_rgba(0,0,0,0.3)]">
      <div className="relative z-20 border-b border-white/5 bg-white/[0.02] pt-4 backdrop-blur-3xl">
        <div className="flex h-16 items-center px-4" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
            className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] py-2 pl-2 pr-3 transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06]"
          >
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {isTTS ? <Mic className="h-3.5 w-3.5" /> : <Music className="h-3.5 w-3.5" />}
            </div>

            <div className="min-w-0 flex-1 text-left">
              <p className="mb-1 text-[9px] font-black uppercase tracking-[0.25em] leading-none text-zinc-600">
                {isTTS ? 'Neural synthesis' : 'Music generation'}
              </p>
              <p className="truncate text-[12px] font-black leading-none text-white">{selectedModel.name}</p>
            </div>

            <ChevronDown
              className={`h-3.5 w-3.5 flex-shrink-0 text-zinc-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {dropdownOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-4 right-4 top-full z-50 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#0d0d14]/98 shadow-2xl backdrop-blur-xl"
              >
                <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Audio models</span>
                  <span className="text-[8px] font-bold text-zinc-600">{availableModels.length} models</span>
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {availableModels.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        onModelChange?.(model);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all ${selectedModel.id === model.id ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'
                        }`}
                    >
                      <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: model.color }} />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-white">{model.name}</span>
                      </div>
                      <span
                        className="flex-shrink-0 rounded-md border px-2 py-0.5 text-[8px] font-bold"
                        style={{
                          color: selectedModel.id === model.id ? model.color : '#6b7280',
                          borderColor: selectedModel.id === model.id ? `${model.color}40` : 'rgba(255,255,255,0.06)',
                          backgroundColor: selectedModel.id === model.id ? `${model.color}12` : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        {MODEL_LIMIT_LABEL}
                      </span>
                      {selectedModel.id === model.id ? (
                        <span className="flex-shrink-0 text-[8px] font-black uppercase text-emerald-500">Active</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-6">
        <div className="space-y-5">
          {isTTS ? (
            <>
              <SectionShell
                color={color}
                eyebrow="Input"
                title="Text for speech"
                subtitle="Magpie TTS stays unchanged"
                icon={Sparkles}
              >
                <TextAreaField
                  label="Text"
                  value={text}
                  onChange={setText}
                  placeholder="Type or paste text..."
                  rows={5}
                  hint="The output on the right will be playable immediately."
                />
              </SectionShell>

              <SectionShell
                color={color}
                eyebrow="Basic settings"
                title="Voice profile and performance"
                subtitle="Speech synthesis settings preserved"
                icon={Settings2}
              >
                {isDeapiTTS ? (
                  <>
                    {showDeapiTtsModeSelector ? (
                      <div className="grid grid-cols-3 gap-2">
                        {(deapiTtsVariants.length > 0 ? deapiTtsVariants : deapiTtsModeOptions).map((option) => (
                          <OptionCard
                            key={option.id}
                            color={color}
                            label={option.label}
                            description={option.description || option.desc}
                            active={deapiTtsVariants.length > 0 ? deapiTtsVariant === option.id : deapiTtsMode === option.id}
                            onClick={() => {
                              if (deapiTtsVariants.length > 0) {
                                setDeapiTtsVariant(option.id);
                              } else {
                                setDeapiTtsMode(option.id);
                              }
                            }}
                            compact
                          />
                        ))}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        label="Language"
                        options={deapiTtsLanguageOptions}
                        value={deapiTtsLang}
                        onChange={setDeapiTtsLang}
                        icon={Globe}
                        compact
                      />
                      <Select
                        label="Format"
                        options={DEAPI_FILE_FORMATS}
                        value={deapiTtsFormat}
                        onChange={setDeapiTtsFormat}
                        icon={Settings2}
                        compact
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        label="Sample rate"
                        options={DEAPI_TTS_SAMPLE_RATES}
                        value={String(deapiTtsSampleRate)}
                        onChange={(value) => setDeapiTtsSampleRate(Number(value))}
                        icon={Activity}
                        compact
                      />
                      <TextInputField
                        label="Speed"
                        type="text"
                        inputMode="decimal"
                        value={deapiTtsSpeed}
                        onChange={setDeapiTtsSpeed}
                        min={effectiveDeapiTtsLimits.minSpeed ?? 0.25}
                        max={effectiveDeapiTtsLimits.maxSpeed ?? 4}
                        step={0.1}
                        hint={`${effectiveDeapiTtsLimits.minSpeed ?? 0.25}-${effectiveDeapiTtsLimits.maxSpeed ?? 4}x`}
                        compact
                        showLimit={false}
                      />
                    </div>

                    {showDeapiTtsVoiceSelector ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {deapiTtsVoiceOptions.map((voice) => (
                            <button
                              key={voice.id}
                              type="button"
                              onClick={() => setDeapiTtsVoice(voice.id)}
                              className={`rounded-xl border px-2 py-2 text-left transition-all duration-300 ${deapiTtsVoice === voice.id
                                ? ''
                                : 'border-white/5 bg-white/[0.01] text-zinc-700 hover:border-white/10 hover:text-zinc-500'
                                }`}
                              style={
                                deapiTtsVoice === voice.id
                                  ? { backgroundColor: `${color}15`, borderColor: `${color}40`, color }
                                  : undefined
                              }
                            >
                              <div className={`truncate text-[10px] font-black uppercase tracking-[0.04em] ${deapiTtsVoice === voice.id ? 'text-white' : ''}`}>
                                {voice.label}
                              </div>
                              <div className="mt-0.5 truncate text-[7px] font-bold uppercase tracking-widest opacity-40">{voice.desc || voice.id}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {effectiveDeapiTtsMode === "voice_clone" ? (
                      <div className="space-y-3">
                        <input
                          ref={ttsReferenceAudioInputRef}
                          type="file"
                          accept=".mp3,.wav,.flac,.ogg,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/ogg,audio/mp4,audio/x-m4a"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            onDeapiTtsReferenceAudioSelect?.(file);
                            event.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => ttsReferenceAudioInputRef.current?.click()}
                          className="flex min-w-0 items-center justify-between gap-3 rounded-[1rem] border border-white/6 bg-white/[0.018] px-3 py-2.5 text-left transition-all duration-300 hover:border-white/12 hover:bg-white/[0.03]"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-[9px] font-black uppercase tracking-[0.08em] text-white">
                              {deapiTtsReferenceAudio ? 'Replace reference' : 'Reference audio'}
                            </p>
                            <p className="mt-1 break-words text-[8px] font-semibold uppercase tracking-[0.03em] leading-snug text-zinc-500">
                              MP3, WAV, FLAC, OGG, M4A | max 10 MB | {deapiTtsRefDurationMin}-{deapiTtsRefDurationMax}s
                            </p>
                          </div>
                          <div
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/8"
                            style={{ backgroundColor: `${color}14`, color }}
                          >
                            <Upload className="h-4 w-4" />
                          </div>
                        </button>

                        {deapiTtsReferenceAudio ? (
                          <div className="rounded-[1rem] border border-white/6 bg-black/20 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-black text-white">{deapiTtsReferenceAudio.name}</p>
                                <p className="mt-1 break-words text-[8px] font-semibold uppercase tracking-[0.03em] leading-snug text-zinc-500">
                                  {[formatFileSize(deapiTtsReferenceAudio.size), formatDurationLabel(deapiTtsReferenceAudio.duration)].filter(Boolean).join(' | ')}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={onDeapiTtsReferenceAudioClear}
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/6 bg-white/[0.03] text-zinc-400 transition-all hover:border-white/12 hover:text-white"
                                aria-label="Remove reference audio"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <TextAreaField
                          label="Reference text"
                          value={deapiTtsRefText}
                          onChange={setDeapiTtsRefText}
                          placeholder="Reference audio transcript, if known"
                          rows={3}
                          compact
                        />
                      </div>
                    ) : null}

                    {effectiveDeapiTtsMode === "voice_design" ? (
                      <TextAreaField
                        label="Voice description"
                        value={deapiTtsInstruct}
                        onChange={setDeapiTtsInstruct}
                        placeholder="Pl. A warm female voice with a British accent"
                        rows={4}
                        hint="Creates a new voice character from this."
                        compact
                      />
                    ) : null}
                  </>
                ) : isNvidiaRiva ? (
                  <>
                    <Select
                      label="Synthesis language"
                      options={RIVA_LANGUAGES}
                      value={rivaLang}
                      onChange={setRivaLang}
                      icon={Globe}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <Activity className="h-3 w-3 text-zinc-600" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 italic">Voice profile</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {rivaVoices.map((voice) => (
                          <button
                            key={voice.name}
                            type="button"
                            onClick={() => setRivaVoiceName(voice.name)}
                            className={`rounded-xl border py-2.5 transition-all duration-300 ${rivaVoiceName === voice.name
                              ? ''
                              : 'border-white/5 bg-white/[0.01] text-zinc-700 hover:border-white/10 hover:text-zinc-500'
                              }`}
                            style={
                              rivaVoiceName === voice.name
                                ? {
                                  backgroundColor: `${color}15`,
                                  borderColor: `${color}40`,
                                  color,
                                  boxShadow: `0 0 15px ${color}08`,
                                }
                                : undefined
                            }
                          >
                            <div className={`text-[10px] font-black uppercase tracking-tighter ${rivaVoiceName === voice.name ? 'text-white' : ''}`}>
                              {voice.name}
                            </div>
                            <div className="mt-0.5 text-[7px] font-bold uppercase tracking-widest opacity-40">{voice.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {hasEmotions ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                          <Smile className="h-3 w-3 text-zinc-600" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 italic">Emotional tone</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(rivaVoices.find((voice) => voice.name === rivaVoiceName)?.emotions || []).map((emotion) => (
                            <button
                              key={emotion}
                              type="button"
                              onClick={() => setRivaEmotion(emotion)}
                              className={`rounded-lg border px-3 py-1.5 text-[9px] font-black transition-all duration-300 ${rivaEmotion === emotion
                                ? ''
                                : 'border-white/5 bg-white/[0.01] text-zinc-700 hover:border-white/10 hover:text-zinc-500'
                                }`}
                              style={
                                rivaEmotion === emotion
                                  ? {
                                    backgroundColor: `${color}15`,
                                    borderColor: `${color}40`,
                                    color,
                                    boxShadow: `0 0 15px ${color}08`,
                                  }
                                  : undefined
                              }
                            >
                              <span className={rivaEmotion === emotion ? 'text-white' : ''}>{EMOTION_EMOJI[emotion] || ""}</span>{' '}
                              {EMOTION_LABELS[emotion] || emotion}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <Activity className="h-3 w-3 text-zinc-600" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 italic">Voice character</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {TTS_VOICES.map((voice) => (
                          <button
                            key={voice.id}
                            type="button"
                            onClick={() => setSelectedVoice(voice.id)}
                            className={`rounded-xl border py-2.5 transition-all duration-300 ${selectedVoice === voice.id
                              ? ''
                              : 'border-white/5 bg-white/[0.01] text-zinc-700 hover:border-white/10 hover:text-zinc-500'
                              }`}
                            style={
                              selectedVoice === voice.id
                                ? {
                                  backgroundColor: `${color}15`,
                                  borderColor: `${color}40`,
                                  color,
                                  boxShadow: `0 0 15px ${color}08`,
                                }
                                : undefined
                            }
                          >
                            <div className={`text-[10px] font-black uppercase tracking-tighter ${selectedVoice === voice.id ? 'text-white' : ''}`}>
                              {voice.label}
                            </div>
                            <div className="mt-0.5 truncate text-[7px] font-bold uppercase tracking-widest opacity-40">{voice.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-3 w-3 text-zinc-600" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 italic">Speech speed</span>
                        </div>
                        <span className="text-[10px] font-black italic" style={{ color }}>{speed}x</span>
                      </div>
                      <div className="relative h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="absolute h-full transition-all duration-300"
                          style={{ width: `${((speed - 0.5) / 1.5) * 100}%`, backgroundColor: color }}
                        />
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={speed}
                          onChange={(event) => setSpeed(parseFloat(event.target.value))}
                          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        />
                      </div>
                    </div>
                  </>
                )}
              </SectionShell>
            </>
          ) : isDeapiMusic ? (
            <>
              <SectionShell
                color={color}
                eyebrow="Prompt"
                title="Music prompt"
                subtitle="Describe the music you want"
                icon={Music}
                compact
              >
                <TextAreaField
                  label="Music prompt"
                  value={deapiCaption}
                  onChange={setDeapiCaption}
                  placeholder="Pl. upbeat electronic dance music with energetic synths and bright festival drops..."
                  rows={4}
                  hint={`Limit: ${deapiCaptionMin}-${deapiCaptionMax} • Current: ${deapiCaptionLength}${deapiCaptionLength > deapiCaptionMax ? " • Too long" : deapiCaptionLength < deapiCaptionMin ? " • Too short" : ""}`}
                  compact
                />

                <div className="rounded-[1rem] border border-white/6 bg-black/20 p-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onDeapiResetDefaults}
                      disabled={deapiResetDisabled}
                      className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 rounded-[0.85rem] border px-2 py-2 text-[9px] font-black uppercase tracking-[0.06em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        borderColor: "rgba(255,255,255,0.08)",
                        backgroundColor: deapiResetDisabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                        color: deapiResetDisabled ? "#71717a" : "#d4d4d8",
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="whitespace-nowrap">Defaults</span>
                    </button>

                    <button
                      type="button"
                      onClick={onDeapiEnhancePrompt}
                      disabled={deapiEnhanceDisabled}
                      className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 rounded-[0.85rem] border px-2 py-2 text-[9px] font-black uppercase tracking-[0.06em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        borderColor: `${color}35`,
                        backgroundColor: deapiEnhanceDisabled ? "rgba(255,255,255,0.02)" : `${color}14`,
                        color: deapiEnhanceDisabled ? "#71717a" : color,
                        boxShadow: deapiEnhanceDisabled ? "none" : `0 12px 30px ${color}18`,
                      }}
                    >
                      {deapiEnhancingPrompt ? <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" /> : <Wand2 className="h-3.5 w-3.5 flex-shrink-0" />}
                      <span className="whitespace-nowrap">{deapiEnhancingPrompt ? "..." : "Enhance"}</span>
                    </button>
                  </div>

                  {deapiEnhancerError ? (
                    <div className="mt-2 flex items-start gap-2 rounded-[0.9rem] border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <p className="break-words text-[9px] font-semibold uppercase tracking-[0.04em] leading-snug">
                        {deapiEnhancerError}
                      </p>
                    </div>
                  ) : null}
                </div>
              </SectionShell>

              <SectionShell
                color={color}
                eyebrow="Lyrics and vocal"
                title="Lyrics mode"
                subtitle="Choose a vocal or instrumental direction"
                icon={Sparkles}
                compact
              >
                <div className="grid grid-cols-3 gap-2">
                  <OptionCard
                    color={color}
                    label="Instrumental"
                    description="No vocal"
                    active={deapiLyricsMode === "instrumental"}
                    onClick={() => setDeapiLyricsMode("instrumental")}
                    compact
                  />
                  <OptionCard
                    color={color}
                    label="Auto-Lyrics"
                    description="AI lyrics"
                    active={deapiLyricsMode === "auto-lyrics"}
                    onClick={() => setDeapiLyricsMode("auto-lyrics")}
                    compact
                  />
                  <OptionCard
                    color={color}
                    label="Lyrics"
                    description="Custom"
                    active={deapiLyricsMode === "lyrics"}
                    onClick={() => setDeapiLyricsMode("lyrics")}
                    compact
                  />
                </div>

                {deapiLyricsMode === "lyrics" ? (
                  <div className="space-y-4">
                    <TextAreaField
                      label="Lyrics"
                      value={deapiLyrics}
                      onChange={setDeapiLyrics}
                      placeholder="Full lyrics with sections, e.g. [Verse], [Chorus]"
                      rows={5}
                      hint="Only sent in lyrics mode."
                      compact
                    />
                  </div>
                ) : null}
              </SectionShell>

              <SectionShell
                color={color}
                eyebrow="Generation parameters"
                title="Fine tuning"
                subtitle="Time, tempo, and generation strength"
                icon={Activity}
                compact
              >
                <div className="grid grid-cols-2 gap-2">
                  <TextInputField
                    label="Duration"
                    type="text"
                    inputMode="numeric"
                    value={deapiDuration}
                    onChange={setDeapiDuration}
                    onCommit={onCommitDeapiDuration}
                    min={deapiDurationMin}
                    max={deapiDurationMax}
                    step={1}
                    hint="10-600 seconds"
                    compact
                    showLimit={false}
                  />
                  {!isTurboInt8DeapiModel && (
                    <>
                      <TextInputField
                        label="Inference steps"
                        type="text"
                        inputMode="numeric"
                        value={deapiInferenceSteps}
                        onChange={setDeapiInferenceSteps}
                        onCommit={onCommitDeapiInferenceSteps}
                        min={deapiStepsMin}
                        max={deapiStepsMax}
                        step={1}
                        hint="5-100"
                        compact
                        showLimit={false}
                      />
                      <TextInputField
                        label="Guidance scale"
                        type="text"
                        inputMode="decimal"
                        value={deapiGuidanceScale}
                        onChange={setDeapiGuidanceScale}
                        onCommit={onCommitDeapiGuidanceScale}
                        min={deapiGuidanceMin}
                        max={deapiGuidanceMax}
                        step={0.1}
                        hint="3–20"
                        compact
                        showLimit={false}
                      />
                    </>
                  )}
                  <TextInputField
                    label="Seed"
                    type="text"
                    inputMode="numeric"
                    value={deapiSeed}
                    onChange={(value) => setDeapiSeed(value.replace(/\D/g, ""))}
                    step={1}

                    compact
                  />
                  <Select
                    label="Format"
                    options={DEAPI_FILE_FORMATS}
                    value={deapiFormat}
                    onChange={setDeapiFormat}
                    icon={Settings2}
                    compact
                  />
                  <TextInputField
                    label="BPM"
                    type="text"
                    inputMode="numeric"
                    value={deapiBpm}
                    onChange={setDeapiBpm}
                    onCommit={onCommitDeapiBpm}
                    min={deapiBpmMin}
                    max={deapiBpmMax}
                    step={1}
                    hint="50-200"
                    compact
                    showLimit={false}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <TextInputField
                    label="Key scale"
                    value={deapiKeyscale}
                    onChange={setDeapiKeyscale}
                    placeholder="C major"
                    hint='E.g. "C major", "F# minor"'
                    compact
                  />
                </div>

                <div className="rounded-[1rem] border border-white/6 bg-black/20 p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                    <div className="min-w-0 truncate text-[8px] font-black uppercase tracking-[0.12em] text-zinc-600 italic">Time signature</div>
                    <div className="flex-shrink-0 text-[9px] font-black uppercase tracking-[0.08em]" style={{ color }}>
                      {deapiSelectedTimeSignature.label}
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {DEAPI_TIME_SIGNATURES.map((signature) => (
                      <button
                        key={signature.id || "auto"}
                        type="button"
                        onClick={() => setDeapiTimesignature(signature.id)}
                        className={`rounded-[0.75rem] border px-1 py-1.5 text-center transition-all duration-300 ${deapiTimesignature === signature.id
                          ? ""
                          : "border-white/6 bg-white/[0.018] text-zinc-500 hover:border-white/12 hover:bg-white/[0.03]"
                          }`}
                        style={deapiTimesignature === signature.id ? { borderColor: `${color}55`, backgroundColor: `${color}12`, color: "#fff" } : undefined}
                      >
                        <div className="text-[8px] font-black uppercase tracking-[0.06em]">{signature.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </SectionShell>

              <SectionShell
                color={color}
                eyebrow="Reference audio"
                title="Style transfer input"
                subtitle="Optional audio sample"
                icon={Upload}
                compact
              >
                <input
                  ref={referenceAudioInputRef}
                  type="file"
                  accept=".mp3,.wav,.flac,.ogg,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/ogg,audio/mp4,audio/x-m4a"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    onDeapiReferenceAudioSelect?.(file);
                    event.target.value = '';
                  }}
                />

                <button
                  type="button"
                  onClick={() => referenceAudioInputRef.current?.click()}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-[1rem] border border-white/6 bg-white/[0.018] px-3 py-2.5 text-left transition-all duration-300 hover:border-white/12 hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="break-words text-[9px] font-black uppercase tracking-[0.08em] text-white">
                      {deapiReferenceAudio ? 'Replace reference audio' : 'Upload reference audio'}
                    </p>
                    <p className="mt-1 break-words text-[8px] font-semibold uppercase tracking-[0.03em] leading-snug text-zinc-500">
                      MP3, WAV, FLAC, OGG, M4A | max 10 MB | {deapiReferenceDurationMin}-{deapiReferenceDurationMax}s
                    </p>
                  </div>
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/8"
                    style={{ backgroundColor: `${color}14`, color }}
                  >
                    <Upload className="h-4 w-4" />
                  </div>
                </button>

                {deapiReferenceAudio ? (
                  <div className="rounded-[1rem] border border-white/6 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-black text-white">{deapiReferenceAudio.name}</p>
                        <p className="mt-1 break-words text-[8px] font-semibold uppercase tracking-[0.03em] leading-snug text-zinc-500">
                          {[formatFileSize(deapiReferenceAudio.size), formatDurationLabel(deapiReferenceAudio.duration)].filter(Boolean).join(' | ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onDeapiReferenceAudioClear}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/6 bg-white/[0.03] text-zinc-400 transition-all hover:border-white/12 hover:text-white"
                        aria-label="Remove reference audio"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </SectionShell>
            </>
          ) : (
            <>
              <SectionShell
                color={color}
                eyebrow="Music concept"
                title="Style, mood, scene"
                subtitle="The prompt describes the full musical direction"
                icon={Music}
              >
                <TextAreaField
                  label="Prompt"
                  value={musicPrompt}
                  onChange={setMusicPrompt}
                  placeholder="Pl. cinematic sci-fi score, dark synth bass, slow build, neon city at midnight..."
                  rows={5}
                  hint="According to the MiniMax docs, style, mood, and situation matter most here."
                />
              </SectionShell>

              <SectionShell
                color={color}
                eyebrow="Vocal and lyrics"
                title="Vocal song or instrumental"
                subtitle="Text field + AI lyrics generation"
                icon={Sparkles}
              >
                <TextAreaField
                  label="Lyrics"
                  value={musicLyrics}
                  onChange={setMusicLyrics}
                  placeholder="[Verse]\nNight falls slow on the boulevard...\n\n[Chorus]\nWe rise through the neon light..."
                  rows={7}
                  disabled={musicInstrumental}
                  hint={
                    musicInstrumental
                      ? 'In instrumental mode, the lyrics field is disabled.'
                      : 'Supported structure tags: [Intro], [Verse], [Chorus], [Bridge], [Outro], and other sections.'
                  }
                />

                <div className="grid grid-cols-1 gap-3">
                  <ToggleCard
                    color={color}
                    label="AI Lyrics"
                    description="If the lyrics field is empty, full lyrics are written from the prompt."
                    active={musicLyricsOptimizer}
                    onClick={() => setMusicLyricsOptimizer((value) => !value)}
                    icon={Sparkles}
                    disabled={musicInstrumental}
                  />
                  <ToggleCard
                    color={color}
                    label="Instrumental"
                    description="Music without vocals; the prompt is required in this mode."
                    active={musicInstrumental}
                    onClick={() => setMusicInstrumental((value) => !value)}
                    icon={Mic}
                  />
                </div>
              </SectionShell>

              <SectionShell
                color={color}
                eyebrow="Output and quality"
                title="Export pipeline"
                subtitle="Designed to match the image AI controls"
                icon={Settings2}
              >
                <div className="space-y-3">
                  <div className="px-1 text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic">Output mode</div>
                  <div className="grid grid-cols-2 gap-3">
                    {MINIMAX_OUTPUT_FORMATS.map((option) => (
                      <OptionCard
                        key={option.id}
                        color={color}
                        label={option.label}
                        description={option.desc}
                        active={musicOutputFormat === option.id}
                        onClick={() => setMusicOutputFormat(option.id)}
                        disabled={musicStream && option.id === 'url'}
                      />
                    ))}
                  </div>
                </div>

                <ToggleCard
                  color={color}
                  label="Stream mode"
                  description="The streamed response is stitched together at the end. Only HEX is allowed while streaming."
                  active={musicStream}
                  onClick={() => setMusicStream((value) => !value)}
                  icon={Activity}
                />

                <div className="space-y-3">
                  <div className="px-1 text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic">Sample rate</div>
                  <div className="grid grid-cols-2 gap-3">
                    {MINIMAX_SAMPLE_RATES.map((sampleRate) => (
                      <OptionCard
                        key={sampleRate}
                        color={color}
                        label={formatSampleRate(sampleRate)}
                        description={`${sampleRate} Hz`}
                        active={musicSampleRate === sampleRate}
                        onClick={() => setMusicSampleRate(sampleRate)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="px-1 text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic">Bitrate</div>
                  <div className="grid grid-cols-2 gap-3">
                    {MINIMAX_BITRATES.map((bitrate) => (
                      <OptionCard
                        key={bitrate}
                        color={color}
                        label={formatBitrate(bitrate)}
                        description={`${bitrate} bps`}
                        active={musicBitrate === bitrate}
                        onClick={() => setMusicBitrate(bitrate)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="px-1 text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic">File format</div>
                  <div className="grid grid-cols-3 gap-3">
                    {MINIMAX_FILE_FORMATS.map((format) => (
                      <OptionCard
                        key={format}
                        color={color}
                        label={format.toUpperCase()}
                        description="MiniMax export"
                        active={musicFileFormat === format}
                        onClick={() => setMusicFileFormat(format)}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-white/6 bg-black/20 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.34em] text-zinc-500 italic">MiniMax rules</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                    Instrumental mode requires a prompt. Vocal mode requires either custom lyrics or AI lyrics generated from the prompt.
                  </p>
                </div>
              </SectionShell>
            </>
          )}
        </div>
      </div>

      <div className="relative z-20 border-t border-white/5 bg-white/[0.02] p-6 shadow-[0_-20px_40px_rgba(0,0,0,0.3)] backdrop-blur-3xl">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !canGenerate}
          className="group/btn relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-[1.2rem] py-4 text-sm font-black uppercase tracking-[0.3em] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 shadow-2xl"
          style={{
            backgroundColor: canGenerate ? color : '#ffffff',
            color: canGenerate ? '#ffffff' : '#000000',
            boxShadow: canGenerate ? `0 10px 30px ${color}30` : 'none',
          }}
        >
          {isGenerating ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Activity className="h-4 w-4" />
              </motion.div>
              <span>Creating...</span>
            </>
          ) : (
            <>
              <span>Start creation</span>
              <Zap className="h-4 w-4 fill-current" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
