import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AudioControls from './AudioControls';
import AudioWorkspace from './AudioWorkspace';
import AudioEngineBg from '../../assets/backgrounds/motif_audio_bg.png';

import BackgroundFilters from '../chat/BackgroundFilters';

export default function AudioGenerator({ selectedModel, userId, getIdToken }) {
  const [activeTab, setActiveTab] = useState("generate");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [speed, setSpeed] = useState(1.0);
  const [audioFormat, setAudioFormat] = useState("mp3");

  const [musicPrompt, setMusicPrompt] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [duration, setDuration] = useState(30);

  const audioRef = useRef(null);
  const isTTS = selectedModel.audioType === "tts";
  const themeColor = selectedModel?.color || "#10b981";

  const handleGenerate = async (params) => {
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    setIsPlaying(false);

    try {
      const token = await getIdToken();
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const endpoint = isTTS ? `${API_BASE}/api/generate-tts` : `${API_BASE}/api/generate-music`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Hiba történt");
      setAudioUrl(data.audioUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full bg-[#03000a] text-white overflow-hidden relative selection:bg-emerald-500/30">
      <BackgroundFilters />

      {/* Cinematic Background Layer — Enhanced High-Fidelity Look */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Base Image with Liquid Wave Distortion & Ken Burns Effect */}
        <div className="absolute inset-0 liquid-wave opacity-60 scale-110 animate-[ken-burns_60s_infinite_alternate_ease-in-out]">
          <img src={AudioEngineBg} alt="bg" className="w-full h-full object-cover saturate-[1.2] brightness-[0.8]" />
        </div>

        {/* Adaptive Aurora Glow Mesh */}
        <div className="absolute inset-0 opacity-40 mix-blend-screen">
          <div
            className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] animate-[aurora-flow_25s_infinite_alternate_ease-in-out]"
            style={{ background: `${themeColor}20` }}
          />
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[140px] animate-[aurora-flow_30s_infinite_alternate_reverse_ease-in-out]"
            style={{ background: `${themeColor}15` }}
          />
        </div>

        {/* Animated Film Grain / Noise Overlay */}
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none grain-overlay"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />

        {/* Deep Vignettes & Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#03000a]/80 via-transparent to-[#03000a]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#03000a]/60 via-transparent to-[#03000a]/60" />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-black via-black/20 to-transparent opacity-90" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
      </div>

      {/* Left: Configuration Panel */}
      <div className="w-80 xl:w-96 h-full border-r border-white/5 flex flex-col bg-[#0a0618]/90 backdrop-blur-[60px] relative z-10 overflow-hidden shadow-[20px_0_40px_rgba(0,0,0,0.3)]">
        <AudioControls
          selectedModel={selectedModel}
          isTTS={isTTS}
          text={text} setText={setText}
          selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice}
          speed={speed} setSpeed={setSpeed}
          audioFormat={audioFormat} setAudioFormat={setAudioFormat}
          musicPrompt={musicPrompt} setMusicPrompt={setMusicPrompt}
          genre={genre} setGenre={setGenre}
          mood={mood} setMood={setMood}
          duration={duration} setDuration={setDuration}
          isGenerating={isGenerating}
          onGenerate={() => handleGenerate(isTTS ? {
            model: selectedModel.apiModel,
            provider: selectedModel.provider,
            text, voice: selectedVoice, speed, format: audioFormat
          } : {
            apiId: selectedModel.apiId,
            prompt: musicPrompt, genre, mood, duration
          })}
        />
      </div>

      {/* Center/Right: Audio Playground */}
      <div className="flex-1 h-full relative overflow-hidden z-10">
        <AudioWorkspace
          audioUrl={audioUrl}
          isGenerating={isGenerating}
          error={error}
          selectedModel={selectedModel}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          audioRef={audioRef}
        />
      </div>
    </div>
  );
}
