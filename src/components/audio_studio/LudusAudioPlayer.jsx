import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const formatAudioTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

export default function LudusAudioPlayer({
  src,
  title = 'Audio asset',
  eyebrow = 'Audio preview',
  accent = '#8a2be2',
  details = '',
  className = '',
}) {
  const audioRef = useRef(null);
  const seekDragRef = useRef(false);
  const volumeDragRef = useRef(false);
  const volumeWrapRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [showVolume, setShowVolume] = useState(false);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const progress = safeDuration > 0 ? clamp(currentTime / safeDuration) * 100 : 0;
  const normalizedAccent = accent || '#8a2be2';

  useEffect(() => {
    setPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    setShowVolume(false);
  }, [src]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (!showVolume) return undefined;
    const handlePointerDown = (event) => {
      if (!volumeWrapRef.current?.contains(event.target)) {
        setShowVolume(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [showVolume]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch (error) {
      console.warn('Audio playback failed:', error);
      setPlaying(false);
    }
  };

  const seekFromPointer = (event) => {
    const audio = audioRef.current;
    if (!audio || !safeDuration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width);
    audio.currentTime = ratio * safeDuration;
    setCurrentTime(audio.currentTime);
  };

  const handleSeekPointerDown = (event) => {
    if (!safeDuration) return;
    event.preventDefault();
    seekDragRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    seekFromPointer(event);
  };

  const handleSeekPointerMove = (event) => {
    if (!seekDragRef.current) return;
    event.preventDefault();
    seekFromPointer(event);
  };

  const finishSeekDrag = (event) => {
    if (!seekDragRef.current) return;
    event.preventDefault();
    seekFromPointer(event);
    seekDragRef.current = false;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const setVolumeFromPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width);
    setVolume(ratio);
  };

  const handleVolumePointerDown = (event) => {
    event.preventDefault();
    volumeDragRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setVolumeFromPointer(event);
  };

  const handleVolumePointerMove = (event) => {
    if (!volumeDragRef.current) return;
    event.preventDefault();
    setVolumeFromPointer(event);
  };

  const finishVolumeDrag = (event) => {
    if (!volumeDragRef.current) return;
    event.preventDefault();
    setVolumeFromPointer(event);
    volumeDragRef.current = false;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleVolumeKeyDown = (event) => {
    const step = event.shiftKey ? 0.1 : 0.05;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      setVolume((value) => clamp(value - step));
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      setVolume((value) => clamp(value + step));
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setVolume(0);
    }
    if (event.key === 'End') {
      event.preventDefault();
      setVolume(1);
    }
  };

  const handleSeekKeyDown = (event) => {
    const audio = audioRef.current;
    if (!audio || !safeDuration) return;
    const step = event.shiftKey ? 10 : 5;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      audio.currentTime = Math.max(0, audio.currentTime - step);
      setCurrentTime(audio.currentTime);
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      audio.currentTime = Math.min(safeDuration, audio.currentTime + step);
      setCurrentTime(audio.currentTime);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      audio.currentTime = 0;
      setCurrentTime(0);
    }
    if (event.key === 'End') {
      event.preventDefault();
      audio.currentTime = safeDuration;
      setCurrentTime(safeDuration);
    }
  };

  const VolumeIcon = volume <= 0.01 ? VolumeX : Volume2;

  return (
    <div className={`relative z-10 w-full max-w-xl rounded-[1.4rem] border border-white/10 bg-[#09070f]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        controlsList="nodownload noplaybackrate"
        className="hidden"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onContextMenu={(event) => event.preventDefault()}
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlayback}
          disabled={!src}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-white shadow-[0_0_28px_rgba(138,43,226,0.28)] transition-all hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-45"
          style={{
            borderColor: `${normalizedAccent}55`,
            backgroundColor: `${normalizedAccent}2e`,
            boxShadow: `0 0 28px ${normalizedAccent}28`,
          }}
          aria-label={playing ? 'Pause audio' : 'Play audio'}
        >
          {playing ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: normalizedAccent }}>
            {eyebrow}
          </p>
          <p className="mt-1 truncate text-lg font-black italic tracking-tight text-white">{title || 'Audio asset'}</p>
          {details ? (
            <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.16em] text-white/28">{details}</p>
          ) : null}
        </div>

        <div ref={volumeWrapRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowVolume((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            aria-label="Hangerő"
            aria-expanded={showVolume}
          >
            <VolumeIcon className="h-5 w-5" />
          </button>

          {showVolume ? (
            <div className="absolute right-0 top-[3.25rem] z-20 w-44 rounded-2xl border border-white/10 bg-[#07050c]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.16em] text-white/38">
                <span>Hangerő</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <div
                role="slider"
                tabIndex={0}
                aria-label="Hangerő szint"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(volume * 100)}
                onPointerDown={handleVolumePointerDown}
                onPointerMove={handleVolumePointerMove}
                onPointerUp={finishVolumeDrag}
                onPointerCancel={finishVolumeDrag}
                onKeyDown={handleVolumeKeyDown}
                className="block h-6 w-full cursor-pointer touch-none select-none rounded-full p-2 outline-none focus-visible:ring-2 focus-visible:ring-white/25 active:cursor-grabbing"
              >
                <span className="relative block h-2 rounded-full bg-white/10">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${volume * 100}%`,
                      background: `linear-gradient(90deg, ${normalizedAccent}, #f0abfc)`,
                    }}
                  />
                  <span
                    className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-white/70 bg-white shadow-[0_0_18px_rgba(255,255,255,0.24)]"
                    style={{ left: `calc(${volume * 100}% - 7px)` }}
                  />
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div
        role="slider"
        tabIndex={safeDuration ? 0 : -1}
        aria-label="Audio position"
        aria-valuemin={0}
        aria-valuemax={Math.round(safeDuration)}
        aria-valuenow={Math.round(currentTime)}
        onPointerDown={handleSeekPointerDown}
        onPointerMove={handleSeekPointerMove}
        onPointerUp={finishSeekDrag}
        onPointerCancel={finishSeekDrag}
        onKeyDown={handleSeekKeyDown}
        className={`mt-5 block h-5 w-full touch-none select-none rounded-full p-1 outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${safeDuration ? 'cursor-pointer active:cursor-grabbing' : 'cursor-not-allowed opacity-60'}`}
      >
        <span className="relative block h-2 rounded-full bg-white/10">
          <span
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${normalizedAccent}, #f0abfc, #22d3ee)`,
            }}
          />
          <span
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/70 bg-white shadow-[0_0_18px_rgba(255,255,255,0.28)]"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">
        <span>{formatAudioTime(currentTime)}</span>
        <span>{formatAudioTime(safeDuration)}</span>
      </div>
    </div>
  );
}
