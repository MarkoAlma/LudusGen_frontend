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
import { ALL_MODELS } from '../../ai_components/models';

const TTS_VOICES = [
  { id: "alloy", label: "Alloy", desc: "Semleges, kiegyensúlyozott" },
  { id: "echo", label: "Echo", desc: "Melankolikus, mély" },
  { id: "fable", label: "Fable", desc: "Kifejező, brit akcentus" },
  { id: "onyx", label: "Onyx", desc: "Mély, tekintélyes" },
  { id: "nova", label: "Nova", desc: "Energikus, barátságos" },
  { id: "shimmer", label: "Shimmer", desc: "Lágy, kellemes" },
];

const MINIMAX_SAMPLE_RATES = [16000, 24000, 32000, 44100];
const MINIMAX_BITRATES = [32000, 64000, 128000, 256000];
const MINIMAX_FILE_FORMATS = ["mp3", "wav", "pcm"];
const MINIMAX_OUTPUT_FORMATS = [
  { id: "url", label: "URL", desc: "24 órás link" },
  { id: "hex", label: "HEX", desc: "Beágyazott adat" },
];
const DEAPI_TIME_SIGNATURES = [
  { id: "", label: "Auto", description: "nincs megadva" },
  { id: "2", label: "2", description: "ütemmutató" },
  { id: "3", label: "3", description: "ütemmutató" },
  { id: "4", label: "4", description: "ütemmutató" },
  { id: "6", label: "6", description: "ütemmutató" },
];

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

function SectionShell({ color, eyebrow, title, subtitle, icon: Icon, children }) {
  return (
    <section className="relative rounded-[1.75rem] border border-white/6 bg-white/[0.025] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.22)]">
      <div
        className="pointer-events-none absolute inset-x-6 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }}
      />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic">{eyebrow}</p>
          <h3 className="mt-2 text-[13px] font-black uppercase tracking-[0.16em] text-white">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/8"
            style={{ backgroundColor: `${color}14`, color }}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function TextAreaField({ label, value, onChange, placeholder, hint, rows = 4, disabled = false }) {
  return (
    <div className="min-w-0 space-y-3">
      <label className="block break-words px-1 text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic leading-relaxed">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full rounded-[1.25rem] border p-4 text-[13px] leading-relaxed transition-all resize-none focus:outline-none ${
          disabled
            ? 'cursor-not-allowed border-white/5 bg-white/[0.015] text-zinc-600 placeholder:text-zinc-800'
            : 'border-white/6 bg-white/[0.02] text-zinc-200 placeholder:text-zinc-800 focus:border-white/12'
        }`}
      />
      {hint ? (
        <p className="break-words px-1 text-[10px] font-bold uppercase tracking-[0.14em] leading-relaxed text-zinc-600">{hint}</p>
      ) : null}
    </div>
  );
}

function TextInputField({ label, value, onChange, onCommit, placeholder, hint, type = "text", inputMode, min, max, step }) {
  const hasMin = min !== undefined && min !== null && min !== "";
  const hasMax = max !== undefined && max !== null && max !== "";
  const limitNote = hasMin && hasMax
    ? Number(min) === Number(max)
      ? `Limit: fixen ${min}`
      : `Limit: ${min}-${max}`
    : null;

  return (
    <div className="min-w-0 space-y-3">
      <label className="block break-words px-1 text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic leading-relaxed">
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
        className="min-w-0 w-full rounded-[1.1rem] border border-white/6 bg-white/[0.02] px-4 py-3 text-[12px] font-bold text-zinc-200 placeholder:text-zinc-700 transition-all focus:outline-none focus:border-white/12"
      />
      {limitNote ? (
        <p className="break-words px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 leading-relaxed">{limitNote}</p>
      ) : null}
      {hint ? (
        <p className="break-words px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600 leading-relaxed">{hint}</p>
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
      className={`min-w-0 w-full rounded-[1.35rem] border p-4 text-left transition-all duration-300 ${
        disabled
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

function OptionCard({ color, label, description, active, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`min-w-0 rounded-[1.2rem] border px-3 py-3 text-center transition-all duration-300 ${
        disabled
          ? 'cursor-not-allowed border-white/5 bg-white/[0.015] opacity-40'
          : active
            ? 'shadow-[0_12px_30px_rgba(0,0,0,0.18)]'
            : 'border-white/6 bg-white/[0.018] hover:border-white/12 hover:bg-white/[0.03]'
      }`}
      style={active ? { borderColor: `${color}55`, backgroundColor: `${color}12` } : undefined}
    >
      <div className="flex min-h-[4.75rem] flex-col items-center justify-center gap-1">
        <div className={`break-words text-[11px] font-black uppercase tracking-[0.16em] leading-tight ${active ? 'text-white' : 'text-zinc-200'}`}>
          {label}
        </div>
        {description ? (
          <div className="break-words text-[8px] font-bold uppercase tracking-[0.08em] leading-[1.45] text-zinc-500">{description}</div>
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
  deapiModelsLoading,
  deapiModelsError,
  deapiModelSlug,
  setDeapiModelSlug,
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
  deapiWebhookUrl,
  setDeapiWebhookUrl,
  deapiReferenceAudio,
  onDeapiReferenceAudioSelect,
  onDeapiReferenceAudioClear,
}) {
  const dropdownRef = useRef(null);
  const referenceAudioInputRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const color = selectedModel.color || "#10b981";

  const isTTS = selectedModel.audioType === "tts";
  const isNvidiaRiva = selectedModel.provider === "nvidia-riva";
  const isDeapiMusic = selectedModel.audioType === "music" && selectedModel.provider === "deapi";
  const selectedDeapiModel = deapiModels.find((model) => model.slug === deapiModelSlug) || null;
  const deapiLimits = selectedDeapiModel?.limits || {};
  const deapiCaptionMin = Number.isFinite(Number(deapiLimits.min_caption)) ? Number(deapiLimits.min_caption) : 3;
  const deapiCaptionMax = Number.isFinite(Number(deapiLimits.max_caption)) ? Number(deapiLimits.max_caption) : 300;
  const deapiDurationMin = Number.isFinite(Number(deapiLimits.min_duration)) ? Number(deapiLimits.min_duration) : 10;
  const deapiDurationMax = Number.isFinite(Number(deapiLimits.max_duration)) ? Number(deapiLimits.max_duration) : 600;
  const deapiStepsMin = Number.isFinite(Number(deapiLimits.min_steps)) ? Number(deapiLimits.min_steps) : 1;
  const deapiStepsMax = Number.isFinite(Number(deapiLimits.max_steps)) ? Number(deapiLimits.max_steps) : 100;
  const deapiGuidanceMin = Number.isFinite(Number(deapiLimits.min_guidance)) ? Number(deapiLimits.min_guidance) : 0;
  const deapiGuidanceMax = Number.isFinite(Number(deapiLimits.max_guidance)) ? Number(deapiLimits.max_guidance) : 20;
  const deapiBpmMin = Number.isFinite(Number(deapiLimits.min_bpm)) ? Number(deapiLimits.min_bpm) : 30;
  const deapiBpmMax = Number.isFinite(Number(deapiLimits.max_bpm)) ? Number(deapiLimits.max_bpm) : 300;
  const deapiReferenceDurationMin = Number.isFinite(Number(deapiLimits.min_ref_audio_duration)) ? Number(deapiLimits.min_ref_audio_duration) : 5;
  const deapiReferenceDurationMax = Number.isFinite(Number(deapiLimits.max_ref_audio_duration)) ? Number(deapiLimits.max_ref_audio_duration) : 60;
  const deapiCaptionLength = deapiCaption.trim().length;
  const hasValidDeapiCaptionLength = deapiCaptionLength >= deapiCaptionMin && deapiCaptionLength <= deapiCaptionMax;
  const deapiEnhanceDisabled = !deapiCaption.trim() || !hasValidDeapiCaptionLength || deapiEnhancingPrompt || isGenerating;
  const deapiResetDisabled = deapiEnhancingPrompt || isGenerating;
  const deapiTimeSignatureIndex = Math.max(0, DEAPI_TIME_SIGNATURES.findIndex((signature) => signature.id === deapiTimesignature));
  const deapiSelectedTimeSignature = DEAPI_TIME_SIGNATURES[deapiTimeSignatureIndex] || DEAPI_TIME_SIGNATURES[0];

  const speechModels = ALL_MODELS
    .filter((model) => model.panelType === 'audio' && model.audioType === 'tts')
    .sort((a, b) => {
      if (a.id === 'nvidia_magpie_tts') return -1;
      if (b.id === 'nvidia_magpie_tts') return 1;
      return 0;
    });
  const musicModels = ALL_MODELS.filter((model) => model.panelType === 'audio' && model.audioType === 'music');
  const availableModels = isTTS ? speechModels : musicModels;

  const canGenerateMiniMax = musicInstrumental
    ? !!musicPrompt.trim()
    : !!musicLyrics.trim() || (musicLyricsOptimizer && !!musicPrompt.trim());
  const hasValidDeapiWebhook = !deapiWebhookUrl.trim() || /^https:\/\//i.test(deapiWebhookUrl.trim());
  const canGenerateDeapi = !!deapiCaption.trim()
    && !!deapiModelSlug.trim()
    && hasValidDeapiCaptionLength
    && hasValidDeapiWebhook
    && (deapiLyricsMode === "instrumental" || deapiLyricsMode === "auto-lyrics" || !!deapiLyrics.trim());
  const canGenerateMusic = isDeapiMusic ? canGenerateDeapi : canGenerateMiniMax;
  const canGenerate = isTTS ? !!text.trim() : canGenerateMusic;

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

  const Select = ({ label, options, value, onChange, icon: Icon }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        {Icon ? <Icon className="h-3 w-3 text-zinc-600" /> : null}
        <label className="text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic">{label}</label>
      </div>
      <div className="group relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-[1.1rem] border border-white/6 bg-white/[0.02] py-3 pl-4 pr-10 text-[11px] font-bold text-zinc-300 transition-all cursor-pointer focus:outline-none focus:border-white/12 group-hover:border-white/12"
        >
          {options.map((option) => (
            <option
              key={typeof option === 'string' ? option : option.code || option.id}
              value={typeof option === 'string' ? option : option.code || option.id}
              className="bg-[#0a0a14]"
            >
              {typeof option === 'string' ? option : option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors group-hover:text-zinc-400">
          <ChevronDown className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );

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
              <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.25em] leading-none text-zinc-600">
                {isTTS ? 'Neurális szintézis' : 'Zenei generálás'}
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
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Hang modellek</span>
                  <span className="text-[8px] font-bold text-zinc-600">{availableModels.length} modell</span>
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
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all ${
                        selectedModel.id === model.id ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: model.color }} />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-white">{model.name}</span>
                        <span className="text-[9px] font-medium text-zinc-600">{model.provider}</span>
                      </div>
                      {selectedModel.id === model.id ? (
                        <span className="flex-shrink-0 text-[8px] font-black uppercase text-emerald-500">Aktív</span>
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
                eyebrow="Bemenet"
                title="Beszédre váró szöveg"
                subtitle="A Magpie TTS változtatás nélkül marad"
                icon={Sparkles}
              >
                <TextAreaField
                  label="Szöveg"
                  value={text}
                  onChange={setText}
                  placeholder="Gépelj vagy másolj be szöveget..."
                  rows={5}
                  hint="A jobb oldali kimenet azonnal lejátszható lesz."
                />
              </SectionShell>

              <SectionShell
                color={color}
                eyebrow="Alapbeállítások"
                title="Hangprofil és előadás"
                subtitle="A beszédszintézis rész megőrizve"
                icon={Settings2}
              >
                {isNvidiaRiva ? (
                  <>
                    <Select
                      label="Szintézis nyelve"
                      options={RIVA_LANGUAGES}
                      value={rivaLang}
                      onChange={setRivaLang}
                      icon={Globe}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <Activity className="h-3 w-3 text-zinc-600" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 italic">Hang profil</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {rivaVoices.map((voice) => (
                          <button
                            key={voice.name}
                            type="button"
                            onClick={() => setRivaVoiceName(voice.name)}
                            className={`rounded-xl border py-2.5 transition-all duration-300 ${
                              rivaVoiceName === voice.name
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
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 italic">Érzelmi tónus</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(rivaVoices.find((voice) => voice.name === rivaVoiceName)?.emotions || []).map((emotion) => (
                            <button
                              key={emotion}
                              type="button"
                              onClick={() => setRivaEmotion(emotion)}
                              className={`rounded-lg border px-3 py-1.5 text-[9px] font-black transition-all duration-300 ${
                                rivaEmotion === emotion
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
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 italic">Hang karakter</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {TTS_VOICES.map((voice) => (
                          <button
                            key={voice.id}
                            type="button"
                            onClick={() => setSelectedVoice(voice.id)}
                            className={`rounded-xl border py-2.5 transition-all duration-300 ${
                              selectedVoice === voice.id
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
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 italic">Beszédsebesség</span>
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
                eyebrow="deAPI modell"
                title="Model slug és leírás"
                subtitle="A hivatalos model endpoint alapján"
                icon={Music}
              >
                <Select
                  label="Model slug"
                  options={
                    deapiModels.length > 0
                      ? deapiModels.map((model) => ({
                          id: model.slug,
                          label: model.name ? `${model.name} — ${model.slug}` : model.slug,
                        }))
                      : [{ id: deapiModelSlug, label: deapiModelSlug || 'AceStep_1_5_Base' }]
                  }
                  value={deapiModelSlug}
                  onChange={setDeapiModelSlug}
                  icon={Settings2}
                />

                <TextAreaField
                  label="Caption"
                  value={deapiCaption}
                  onChange={setDeapiCaption}
                  placeholder="Pl. upbeat electronic dance music with energetic synths and bright festival drops..."
                  rows={5}
                  hint={`Limit: ${deapiCaptionMin}-${deapiCaptionMax} • Jelenleg: ${deapiCaptionLength}${deapiCaptionLength > deapiCaptionMax ? " • Túl hosszú" : deapiCaptionLength < deapiCaptionMin ? " • Túl rövid" : ""}`}
                />

                <div className="rounded-[1.25rem] border border-white/6 bg-black/20 p-4">
                  <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={onDeapiResetDefaults}
                        disabled={deapiResetDisabled}
                        className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 rounded-[1rem] border px-2 py-3 text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
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
                      className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 rounded-[1rem] border px-2 py-3 text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
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
                    <div className="mt-3 flex items-start gap-2 rounded-[1rem] border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-rose-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <p className="break-words text-[10px] font-bold uppercase tracking-[0.1em] leading-relaxed">
                        {deapiEnhancerError}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[1.25rem] border border-white/6 bg-black/20 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.34em] text-zinc-500 italic">Model státusz</p>
                  <p className="mt-2 break-words text-[10px] font-bold uppercase tracking-[0.12em] leading-relaxed text-zinc-600">
                    {deapiModelsLoading
                      ? 'deAPI modellek betöltése...'
                      : deapiModelsError
                        ? deapiModelsError
                        : deapiModels.length > 0
                          ? `${deapiModels.length} elérhető txt2music modell · guidance ${deapiGuidanceMin}-${deapiGuidanceMax} · bpm ${deapiBpmMin}-${deapiBpmMax}`
                          : 'Nincs betöltött modelllista, fallback slug használva.'}
                  </p>
                </div>
              </SectionShell>

              <SectionShell
                color={color}
                eyebrow="Dalszöveg és vokál"
                title="Lyrics vezérlés"
                subtitle="Az API külön lyrics mezőt kér"
                icon={Sparkles}
              >
                <div className="grid grid-cols-3 gap-2">
                  <OptionCard
                    color={color}
                    label="Auto-Lyrics"
                    description="AI írja a szöveget"
                    active={deapiLyricsMode === "auto-lyrics"}
                    onClick={() => setDeapiLyricsMode("auto-lyrics")}
                  />
                  <OptionCard
                    color={color}
                    label="Lyrics"
                    description="Te írod a szöveget"
                    active={deapiLyricsMode === "lyrics"}
                    onClick={() => setDeapiLyricsMode("lyrics")}
                  />
                  <OptionCard
                    color={color}
                    label="Instrumental"
                    description="Nincs vokál"
                    active={deapiLyricsMode === "instrumental"}
                    onClick={() => setDeapiLyricsMode("instrumental")}
                  />
                </div>

                {deapiLyricsMode === "lyrics" ? (
                  <div className="space-y-4">
                    <TextAreaField
                      label="Lyrics"
                      value={deapiLyrics}
                      onChange={setDeapiLyrics}
                      placeholder="Teljes dalszöveg szekciókkal, pl. [Verse], [Chorus]"
                      rows={7}
                      hint="Csak lyrics módban kerül beküldésre."
                    />
                  </div>
                ) : deapiLyricsMode === "auto-lyrics" ? (
                  <div className="rounded-[1.25rem] border border-white/6 bg-black/20 p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.34em] text-zinc-500 italic">Auto-lyrics mód</p>
                    <p className="mt-2 break-words text-[10px] font-bold uppercase tracking-[0.12em] leading-relaxed text-zinc-600">
                      Generáláskor az AI előbb megírja a dalszöveget a caption alapján, és azt küldi tovább a modellnek.
                    </p>
                  </div>
                ) : deapiLyricsMode === "instrumental" ? (
                  <div className="rounded-[1.25rem] border border-white/6 bg-black/20 p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.34em] text-zinc-500 italic">Instrumental mód</p>
                    <p className="mt-2 break-words text-[10px] font-bold uppercase tracking-[0.12em] leading-relaxed text-zinc-600">
                      Ebben a módban a backend automatikusan a <span className="text-zinc-300">[Instrumental]</span> lyrics értéket küldi a modellnek.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[1.25rem] border border-white/6 bg-black/20 p-4">
                    <p className="break-words text-[10px] font-bold uppercase tracking-[0.12em] leading-relaxed text-zinc-600">
                      Válassz módot, vagy használd az Enhance gombot.
                    </p>
                  </div>
                )}
              </SectionShell>

              <SectionShell
                color={color}
                eyebrow="Generálási paraméterek"
                title="Idő, lépések, guidance"
                subtitle="A deAPI txt2music összes szöveges paramétere"
                icon={Activity}
              >
                <div className="grid grid-cols-1 gap-4">
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
                    hint="10–600 másodperc"
                  />
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
                    hint="Turbo modelhez jellemzően 8"
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
                    hint="0–20"
                  />
                  <TextInputField
                    label="Seed"
                    type="text"
                    inputMode="numeric"
                    value={deapiSeed}
                    onChange={setDeapiSeed}
                    step={1}
                    hint="-1 = random"
                  />
                  <TextInputField
                    label="Format"
                    value={deapiFormat}
                    onChange={setDeapiFormat}
                    placeholder="flac"
                    hint="Az API stringként várja. A docs példája: flac."
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
                    hint="Opcionális, 30–300"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <TextInputField
                    label="Key scale"
                    value={deapiKeyscale}
                    onChange={setDeapiKeyscale}
                    placeholder="C major"
                    hint='Pl. "C major", "F# minor"'
                  />
                  <TextInputField
                    label="Webhook URL"
                    value={deapiWebhookUrl}
                    onChange={setDeapiWebhookUrl}
                    placeholder="https://example.com/webhooks/deapi"
                    hint="Opcionális, csak HTTPS lehet."
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <div className="text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic">Time signature</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color }}>
                      {deapiSelectedTimeSignature.label}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/6 bg-black/20 p-4">
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="absolute h-full transition-all duration-300"
                        style={{
                          width: `${(deapiTimeSignatureIndex / (DEAPI_TIME_SIGNATURES.length - 1)) * 100}%`,
                          backgroundColor: color,
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max={String(DEAPI_TIME_SIGNATURES.length - 1)}
                        step="1"
                        value={deapiTimeSignatureIndex}
                        onChange={(event) => {
                          const nextIndex = Number(event.target.value);
                          setDeapiTimesignature(DEAPI_TIME_SIGNATURES[nextIndex]?.id ?? "");
                        }}
                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {DEAPI_TIME_SIGNATURES.map((signature) => (
                        <button
                          key={signature.id || "auto"}
                          type="button"
                          onClick={() => setDeapiTimesignature(signature.id)}
                          className={`rounded-[0.9rem] border px-2 py-2 text-center transition-all duration-300 ${
                            deapiTimesignature === signature.id
                              ? ""
                              : "border-white/6 bg-white/[0.018] text-zinc-500 hover:border-white/12 hover:bg-white/[0.03]"
                          }`}
                          style={deapiTimesignature === signature.id ? { borderColor: `${color}55`, backgroundColor: `${color}12`, color: "#fff" } : undefined}
                        >
                          <div className="text-[9px] font-black uppercase tracking-[0.14em]">{signature.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-white/6 bg-black/20 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.34em] text-zinc-500 italic">deAPI szabályok</p>
                  <p className="mt-2 break-words text-[10px] font-bold uppercase tracking-[0.12em] leading-relaxed text-zinc-600">
                    A reference audio már támogatott. A webhook mező opcionális, de ha megadod, HTTPS URL kell legyen.
                  </p>
                </div>
              </SectionShell>

              <SectionShell
                color={color}
                eyebrow="Referencia audio"
                title="Style transfer input"
                subtitle="Opcionais audio mintaval"
                icon={Upload}
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
                  className="flex min-w-0 items-center justify-between gap-3 rounded-[1.35rem] border border-white/6 bg-white/[0.018] px-4 py-4 text-left transition-all duration-300 hover:border-white/12 hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white">
                      {deapiReferenceAudio ? 'Referencia audio csere' : 'Referencia audio feltoltes'}
                    </p>
                    <p className="mt-2 break-words text-[9px] font-bold uppercase tracking-[0.12em] leading-relaxed text-zinc-500">
                      MP3, WAV, FLAC, OGG, M4A | max 10 MB | {deapiReferenceDurationMin}-{deapiReferenceDurationMax}s
                    </p>
                  </div>
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/8"
                    style={{ backgroundColor: `${color}14`, color }}
                  >
                    <Upload className="h-4 w-4" />
                  </div>
                </button>

                {deapiReferenceAudio ? (
                  <div className="rounded-[1.35rem] border border-white/6 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-black text-white">{deapiReferenceAudio.name}</p>
                        <p className="mt-2 break-words text-[9px] font-bold uppercase tracking-[0.12em] leading-relaxed text-zinc-500">
                          {[formatFileSize(deapiReferenceAudio.size), formatDurationLabel(deapiReferenceAudio.duration)].filter(Boolean).join(' | ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onDeapiReferenceAudioClear}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/6 bg-white/[0.03] text-zinc-400 transition-all hover:border-white/12 hover:text-white"
                        aria-label="Referencia audio torlese"
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
                eyebrow="Zenei koncepció"
                title="Stílus, hangulat, jelenet"
                subtitle="A prompt írja le a teljes zenei irányt"
                icon={Music}
              >
                <TextAreaField
                  label="Prompt"
                  value={musicPrompt}
                  onChange={setMusicPrompt}
                  placeholder="Pl. cinematic sci-fi score, dark synth bass, slow build, neon city at midnight..."
                  rows={5}
                  hint="A MiniMax docs szerint itt a stílus, hangulat és szituáció a legfontosabb."
                />
              </SectionShell>

              <SectionShell
                color={color}
                eyebrow="Vokál és dalszöveg"
                title="Énekes dal vagy instrumentális"
                subtitle="Szövegmező + AI dalszöveg generálás"
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
                      ? 'Instrumentális módban a dalszöveg mező inaktív.'
                      : 'Támogatott struktúra tagek: [Intro], [Verse], [Chorus], [Bridge], [Outro] és további szekciók.'
                  }
                />

                <div className="grid grid-cols-1 gap-3">
                  <ToggleCard
                    color={color}
                    label="AI Dalszöveg"
                    description="Ha üres a lyrics mező, a promptból ír teljes dalszöveget."
                    active={musicLyricsOptimizer}
                    onClick={() => setMusicLyricsOptimizer((value) => !value)}
                    icon={Sparkles}
                    disabled={musicInstrumental}
                  />
                  <ToggleCard
                    color={color}
                    label="Instrumentális"
                    description="Vokál nélküli zene, ilyenkor a prompt kötelező."
                    active={musicInstrumental}
                    onClick={() => setMusicInstrumental((value) => !value)}
                    icon={Mic}
                  />
                </div>
              </SectionShell>

              <SectionShell
                color={color}
                eyebrow="Kimenet és minőség"
                title="Export pipeline"
                subtitle="A design a kép AI vezérlőkhöz igazítva"
                icon={Settings2}
              >
                <div className="space-y-3">
                  <div className="px-1 text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic">Kimeneti mód</div>
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
                  label="Stream mód"
                  description="A streamelt válasz végül összefűzve kerül vissza. Streamnél csak HEX engedett."
                  active={musicStream}
                  onClick={() => setMusicStream((value) => !value)}
                  icon={Activity}
                />

                <div className="space-y-3">
                  <div className="px-1 text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic">Mintavétel</div>
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
                  <div className="px-1 text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic">Bitráta</div>
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
                  <div className="px-1 text-[9px] font-black uppercase tracking-[0.34em] text-zinc-600 italic">Fájlformátum</div>
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
                  <p className="text-[9px] font-black uppercase tracking-[0.34em] text-zinc-500 italic">MiniMax szabályok</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                    Instrumentális módban prompt kell. Énekes módban vagy saját lyrics kell, vagy AI dalszöveg-generálás prompt alapján.
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
              <span>Alkotás...</span>
            </>
          ) : (
            <>
              <span>Létrehozás indítása</span>
              <Zap className="h-4 w-4 fill-current" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
