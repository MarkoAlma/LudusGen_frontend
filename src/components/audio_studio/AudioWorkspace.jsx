import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Mic, Music, Layout,
  Sparkles, History, Activity, Share2, Trash2, X, AlertCircle
} from 'lucide-react';
import { API_BASE } from '../../api/client';
import LudusAudioPlayer from './LudusAudioPlayer';

const MiniWaveform = ({ color, isPlaying }) => (
  <div className="flex items-center justify-center gap-[2px] sm:gap-1 md:gap-1.5 h-20 sm:h-24 md:h-32 px-4 sm:px-8 md:px-16 relative overflow-hidden">
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
        className="w-[2px] sm:w-[2.5px] md:w-[3px] rounded-full shadow-lg"
        style={{
          backgroundColor: isPlaying ? color : 'rgba(255,255,255,0.05)',
        }}
      />
    ))}
  </div>
);

const MIME_TO_EXTENSION = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/pcm": "pcm",
};

const formatSampleRate = (sampleRate) => {
  if (!sampleRate) return null;
  if (sampleRate >= 1000) {
    const kiloHertz = sampleRate / 1000;
    return `${Number.isInteger(kiloHertz) ? kiloHertz : kiloHertz.toFixed(1)} kHz`;
  }
  return `${sampleRate} Hz`;
};

const formatBitrate = (bitrate) => {
  if (!bitrate) return null;
  return `${Math.round(bitrate / 1000)} kbps`;
};

const guessExtensionFromUrl = (audioUrl) => {
  if (!audioUrl) return "mp3";
  if (audioUrl.startsWith("data:")) {
    const mime = audioUrl.slice(5, audioUrl.indexOf(";"));
    return MIME_TO_EXTENSION[mime] || "mp3";
  }

  try {
    const url = new URL(audioUrl);
    const match = url.pathname.match(/\.([a-z0-9]+)$/i);
    if (match?.[1]) return match[1].toLowerCase();
  } catch {}

  return "mp3";
};

const triggerBlobDownload = (blob, filename) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const formatHistoryDate = (item) => {
  const millis = item?.createdAtMs
    || (item?.createdAt?.seconds ? item.createdAt.seconds * 1000 : null);
  if (!millis) return "";
  return new Date(millis).toLocaleDateString();
};

const isMusicHistoryItem = (item) => item?.type === "music";

const getHistoryKind = (item) => isMusicHistoryItem(item)
  ? { id: "music", label: "Music", accent: "#a855f7", Icon: Music }
  : { id: "voice", label: "Voice", accent: "#06b6d4", Icon: Mic };

const getHistoryTitle = (item) => {
  const title = item?.title || item?.caption || item?.prompt || item?.text || item?.lyrics;
  return String(title || "Untitled audio").trim();
};

const getHistoryMeta = (item) => {
  const model = item?.deapiModel || item?.model || item?.modelId || item?.legacyModelId;
  return [
    item?.provider,
    model,
    item?.fileFormat || item?.format,
  ].filter(Boolean).map((part) => String(part));
};

const buildHistoryAudioInfo = (item) => ({
  fileFormat: item?.fileFormat || item?.format || (isMusicHistoryItem(item) ? "mp3" : "wav"),
  sampleRate: item?.sampleRate || null,
  bitrate: item?.bitrate || null,
  outputFormat: item?.outputFormat || null,
  stream: Boolean(item?.stream),
  audioId: item?.audioId || null,
});

export default function AudioWorkspace({ 
  view, 
  isGenerating, 
  generationProgress = 0,
  generationStatus = "",
  generationElapsed = 0,
  audioUrl, 
  audioInfo,
  error,
  color, 
  history,
  onHistorySelect,
  getIdToken,
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [activeHistoryItem, setActiveHistoryItem] = useState(null);
  const [activeHistoryAudioUrl, setActiveHistoryAudioUrl] = useState("");
  const [activeHistoryAudioInfo, setActiveHistoryAudioInfo] = useState(null);
  const [isHistoryAudioLoading, setIsHistoryAudioLoading] = useState(false);
  const [historyModalError, setHistoryModalError] = useState("");

  const downloadAudio = async ({ sourceUrl, info, filenamePrefix = "neural_audio" }) => {
    if (!sourceUrl) return;
    const safeSourceUrl = String(sourceUrl);
    const extension = String(info?.fileFormat || guessExtensionFromUrl(safeSourceUrl) || "mp3")
      .replace(/^\./, "")
      .toLowerCase();
    const filename = `${filenamePrefix}_${Date.now()}.${extension}`;

    setIsDownloading(true);
    setDownloadError("");

    try {
      if (safeSourceUrl.startsWith("data:") || safeSourceUrl.startsWith("blob:")) {
        const response = await fetch(safeSourceUrl);
        const blob = await response.blob();
        triggerBlobDownload(blob, filename);
        return;
      }

      const token = getIdToken ? await getIdToken() : "";
      const response = await fetch(`${API_BASE}/api/audio/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ audioUrl: safeSourceUrl, filename }),
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const payload = await response.json();
          message = payload.message || message;
        } catch {}
        throw new Error(message);
      }

      const blob = await response.blob();
      triggerBlobDownload(blob, filename);
    } catch (err) {
      console.error("Audio download failed:", err);
      setDownloadError(err.message || "Download failed.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownload = () => downloadAudio({
    sourceUrl: audioUrl,
    info: audioInfo,
    filenamePrefix: "neural_audio",
  });

  const closeHistoryModal = () => {
    setActiveHistoryItem(null);
    setActiveHistoryAudioUrl("");
    setActiveHistoryAudioInfo(null);
    setIsHistoryAudioLoading(false);
    setHistoryModalError("");
    setDownloadError("");
  };

  const openHistoryModal = async (item) => {
    setActiveHistoryItem(item);
    setActiveHistoryAudioUrl("");
    setActiveHistoryAudioInfo(buildHistoryAudioInfo(item));
    setIsHistoryAudioLoading(true);
    setHistoryModalError("");
    setDownloadError("");

    try {
      const result = await onHistorySelect?.(item, { keepHistory: true });
      const nextAudioUrl = result?.audioUrl || item?.audioUrl || "";
      const nextAudioInfo = result?.audioInfo || buildHistoryAudioInfo(item);
      if (!nextAudioUrl) throw new Error("Archived audio could not be loaded.");
      setActiveHistoryAudioUrl(nextAudioUrl);
      setActiveHistoryAudioInfo(nextAudioInfo);
    } catch (err) {
      console.warn("Archive modal load error:", err.message);
      setHistoryModalError(err.message || "Archived audio could not be loaded.");
    } finally {
      setIsHistoryAudioLoading(false);
    }
  };

  const handleHistoryDownload = () => {
    const kind = getHistoryKind(activeHistoryItem);
    downloadAudio({
      sourceUrl: activeHistoryAudioUrl,
      info: activeHistoryAudioInfo,
      filenamePrefix: kind.id === "music" ? "ludusgen_zene" : "ludusgen_hang",
    });
  };

  const playbackDetails = [
    audioInfo?.fileFormat ? audioInfo.fileFormat.toUpperCase() : null,
    formatSampleRate(audioInfo?.sampleRate),
    formatBitrate(audioInfo?.bitrate),
  ].filter(Boolean).join(" • ");
  const safeGenerationProgress = Math.max(6, Math.min(100, Math.round(Number(generationProgress) || 0)));
  const generationStatusLabel = generationStatus || "PROCESSING";
  const safeHistory = Array.isArray(history) ? history : [];
  const historyCounts = safeHistory.reduce((counts, item) => {
    if (isMusicHistoryItem(item)) counts.music += 1;
    else counts.voice += 1;
    counts.all += 1;
    return counts;
  }, { all: 0, voice: 0, music: 0 });
  const historyFilters = [
    { id: "all", label: "All", count: historyCounts.all, Icon: Layout },
    { id: "voice", label: "Voice", count: historyCounts.voice, Icon: Mic },
    { id: "music", label: "Music", count: historyCounts.music, Icon: Music },
  ];
  const filteredHistory = safeHistory.filter((item) => {
    if (historyFilter === "all") return true;
    return historyFilter === "music" ? isMusicHistoryItem(item) : !isMusicHistoryItem(item);
  });
  const activeHistoryKind = activeHistoryItem ? getHistoryKind(activeHistoryItem) : getHistoryKind(null);
  const ActiveHistoryIcon = activeHistoryKind.Icon;
  const activeHistoryTitle = activeHistoryItem ? getHistoryTitle(activeHistoryItem) : "";
  const activeHistoryMeta = activeHistoryItem ? getHistoryMeta(activeHistoryItem) : [];
  const activeHistoryDetails = [
    activeHistoryAudioInfo?.fileFormat ? activeHistoryAudioInfo.fileFormat.toUpperCase() : null,
    formatSampleRate(activeHistoryAudioInfo?.sampleRate),
    formatBitrate(activeHistoryAudioInfo?.bitrate),
  ].filter(Boolean).join(" | ");

  return (
    <div className="h-full w-full relative z-10 flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'history' ? (
          <motion.div 
            key="history-grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-6xl h-full flex flex-col gap-5"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex shrink-0 items-center justify-center">
                  <History className="w-5 h-5 text-white/40" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-white italic uppercase tracking-[0.2em]">Archive</h2>
                  <p className="mt-0.5 text-[10px] font-bold text-white/25 uppercase tracking-widest">Voices and music</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {historyFilters.map((filter) => {
                  const FilterIcon = filter.Icon;
                  const isActive = historyFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setHistoryFilter(filter.id)}
                      className={`flex h-10 items-center gap-2 rounded-2xl border px-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                        isActive
                          ? "border-white/20 bg-white/10 text-white shadow-lg shadow-black/20"
                          : "border-white/5 bg-white/[0.025] text-white/35 hover:border-white/12 hover:bg-white/[0.05] hover:text-white/70"
                      }`}
                    >
                      <FilterIcon className="h-3.5 w-3.5 shrink-0" />
                      <span>{filter.label}</span>
                      <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[9px] text-white/45">{filter.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 gap-3 pb-6 xl:grid-cols-2">
                {filteredHistory.map((item, idx) => (
                  <button 
                    key={item.id || idx}
                    type="button"
                    onClick={() => openHistoryModal(item)}
                    className="group relative min-h-[132px] overflow-hidden rounded-[1.35rem] border border-white/5 bg-[#090711]/70 p-4 text-left shadow-2xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.04] flex items-start gap-4"
                  >
                    <div className={`w-12 h-12 rounded-2xl border flex shrink-0 items-center justify-center transition-transform group-hover:scale-105 ${
                      item.type === 'music'
                        ? 'border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-300'
                        : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300'
                    }`}>
                      {item.type === 'music' ? <Music className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] ${
                          item.type === 'music'
                            ? 'border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-300'
                            : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300'
                        }`}>
                          {item.type === 'music' ? 'Music' : 'Voice'}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/25">{formatHistoryDate(item) || "archive"}</span>
                      </div>
                      <div className="line-clamp-2 text-[13px] font-black leading-snug text-white">
                        {getHistoryTitle(item)}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[0.16em] text-white/25">
                        {getHistoryMeta(item).slice(0, 3).map((part) => (
                          <span key={part} className="max-w-[12rem] truncate rounded-lg bg-white/[0.03] px-2 py-1">
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {filteredHistory.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-white/[0.015] text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/25">
                    <History className="h-6 w-6" />
                  </div>
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">No results</div>
                  <div className="mt-2 text-[9px] font-bold uppercase tracking-widest text-white/20">The archive is empty for this filter</div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            key="audio-error"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-red-500/20 bg-red-500/5 text-red-500 shadow-2xl">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase tracking-tight text-white italic">Protocol error</h3>
              <p className="max-w-md text-[11px] font-bold uppercase tracking-widest leading-relaxed text-zinc-600">
                {error}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="forge-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center justify-center"
          >
            {isGenerating ? (
              <div className="flex flex-col items-center gap-8 text-center">
                <MiniWaveform color={color} isPlaying={true} />
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10">
                    <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-[10px] font-black text-white italic uppercase tracking-[0.2em]">Audio generation</span>
                  </div>
                  <div className="w-64 max-w-[72vw] flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center rounded-md border border-white/5 bg-white/[0.025] px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-zinc-400">
                      {generationStatusLabel}
                    </div>
                    <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${safeGenerationProgress}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                      {safeGenerationProgress}%{generationElapsed > 0 ? ` | ${generationElapsed}s` : ''}
                    </div>
                  </div>
                </div>
              </div>
            ) : audioUrl ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-3xl min-h-[420px] sm:min-h-[460px] md:min-h-0 md:aspect-[16/10] flex flex-col rounded-[2rem] md:rounded-[2.5rem] bg-white/[0.01] backdrop-blur-2xl border border-white/5 shadow-2xl relative overflow-hidden"
              >
                {/* Visual Flair */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:px-8 sm:py-8 md:p-12">
                  <div className="mb-6 sm:mb-8 md:mb-12 flex flex-col items-center text-center gap-2">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] italic">Audio created successfully</div>
                    <h3 className="text-3xl font-black text-white uppercase tracking-wider line-clamp-1 italic">
                      Neural Master v1
                    </h3>
                  </div>

                  <div className="w-full max-w-2xl">
                    <LudusAudioPlayer
                      src={audioUrl}
                      title="Neural Master v1"
                      eyebrow="Audio created successfully"
                      accent={color}
                      details={playbackDetails || 'AI audio output'}
                      className="max-w-none"
                    />
                  </div>

                  <div className="mt-6 flex flex-col items-center gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:cursor-wait disabled:opacity-50"
                        title={isDownloading ? "Downloading..." : "Download"}
                      >
                        {isDownloading ? (
                          <Activity className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                        ) : (
                          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </button>
                      <button className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                        <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                    {downloadError ? (
                      <p className="max-w-[16rem] break-words text-center text-[8px] font-bold uppercase tracking-[0.12em] text-rose-300">
                        {downloadError}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Status Bar */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 md:px-10 md:py-5 bg-white/[0.02] border-t border-white/5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">
                      {audioInfo?.stream ? 'Streamed signal' : 'Stable signal'}
                    </span>
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-bold text-zinc-700 uppercase tracking-[0.18em] sm:tracking-widest sm:text-right">
                    {playbackDetails || 'AI audio output'}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center gap-6 opacity-20">
                <div className="w-24 h-24 rounded-[2rem] border-2 border-dashed border-white/10 flex items-center justify-center">
                  <Mic className="w-10 h-10" />
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-black uppercase tracking-[0.4em] italic mb-1">Waiting for input</h4>
                  <p className="text-[9px] font-bold uppercase tracking-widest">Set the parameters to begin</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeHistoryItem ? (
          <motion.div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeHistoryModal}
          >
            <motion.div
              className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#080610]/95 shadow-2xl shadow-black/60"
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                    style={{
                      color: activeHistoryKind.accent,
                      borderColor: `${activeHistoryKind.accent}35`,
                      backgroundColor: `${activeHistoryKind.accent}12`,
                    }}
                  >
                    <ActiveHistoryIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="mb-1 text-[9px] font-black uppercase tracking-[0.22em]"
                      style={{ color: activeHistoryKind.accent }}
                    >
                      {activeHistoryKind.label}
                    </div>
                    <h3 className="line-clamp-2 text-base font-black leading-tight text-white sm:text-lg">
                      {activeHistoryTitle}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeHistoryModal}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03] text-white/40 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-5 sm:px-6">
                <div className="mb-4 flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
                  {[...activeHistoryMeta, activeHistoryDetails, formatHistoryDate(activeHistoryItem)]
                    .filter(Boolean)
                    .slice(0, 5)
                    .map((part) => (
                      <span key={part} className="max-w-[12rem] truncate rounded-lg border border-white/5 bg-white/[0.025] px-2 py-1">
                        {part}
                      </span>
                    ))}
                </div>

                {isHistoryAudioLoading ? (
                  <div className="flex h-20 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-white/45">
                    <Activity className="h-5 w-5 animate-pulse" />
                  </div>
                ) : historyModalError ? (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-rose-200">
                    {historyModalError}
                  </div>
                ) : (
                  <LudusAudioPlayer
                    src={activeHistoryAudioUrl}
                    title={activeHistoryTitle}
                    eyebrow="Archive playback"
                    accent={activeHistoryKind.accent}
                    details={activeHistoryDetails || "AI audio"}
                    className="max-w-none"
                  />
                )}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/25">
                    {activeHistoryDetails || "AI audio"}
                  </div>
                  <button
                    type="button"
                    onClick={handleHistoryDownload}
                    disabled={!activeHistoryAudioUrl || isHistoryAudioLoading || isDownloading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-45"
                  >
                    {isDownloading ? <Activity className="h-4 w-4 animate-pulse" /> : <Download className="h-4 w-4" />}
                    Download
                  </button>
                </div>
                {downloadError ? (
                  <div className="mt-3 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-rose-300">
                    {downloadError}
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
