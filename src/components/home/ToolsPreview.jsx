import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Image as ImageIcon, MessageSquare, Music, Zap } from 'lucide-react';
import Container from '../ui/Container';

import ChatImg from '../../assets/home_preview_ludusgen_chat.png';
import ImageImg from '../../assets/home_preview_ludusgen_image.png';
import AudioImg from '../../assets/home_preview_ludusgen_audio.png';
import ForgeImg from '../../assets/home_preview_ludusgen_3d.png';

import HomeBackdrop from './HomeBackdrop';
import ChatStudioBG from '../../assets/ludusgen_jvubFciJtA0Fw42FoJ0N.avif';

export default function ToolsPreview() {
  const [activeTab, setActiveTab] = useState(0);

  const tools = [
    {
      id: 'chat',
      label: 'AI Chat',
      icon: MessageSquare,
      image: ChatImg,
      desc: 'Gemma, Gemini, Trinity, Mistral, Groq, NVIDIA, and Cerebras chat models in one workspace, with vision-capable models clearly marked.',
      features: ['Vision models', 'Streaming replies', 'Context summaries'],
    },
    {
      id: 'image',
      label: 'Image Studio',
      icon: ImageIcon,
      image: ImageImg,
      desc: 'Generate and edit images with SDXL, Flux, Qwen Image, Z-Image, ModelScope, and NVIDIA models.',
      features: ['Prompt to image', 'Image edit', 'Upscale'],
    },
    {
      id: 'audio',
      label: 'Audio Studio',
      icon: Music,
      image: AudioImg,
      desc: 'Create speech, clone voices, and generate music with ACE-Step, Kokoro, Chatterbox, Magpie, and Qwen3 TTS models.',
      features: ['Text-to-speech', 'Text-to-music', 'Voice clone'],
    },
    {
      id: '3d',
      label: '3D Studio',
      icon: Box,
      image: ForgeImg,
      desc: 'Turn text or images into 3D assets with Tripo3D and Trellis export workflows.',
      features: ['Text/Image to 3D', 'GLB/FBX export', 'Task queue'],
    },
  ];

  return (
    <section className="py-24 md:py-48 relative overflow-hidden">
      <HomeBackdrop
        image={ChatStudioBG}
        className="opacity-40 transform scale-110"
        topFade
        bottomFade
      />

      <Container>
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-8"
          >
            <Zap className="w-3 h-3" /> Real LudusGen modules
          </motion.div>
          <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter mb-8 leading-none">
            One studio, <span className="text-primary">four workspaces.</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto font-bold">
            The four core workspaces run inside the same AI Studio, with shared navigation, saved outputs, and credit-based usage.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-stretch justify-between gap-16">
          <div className="w-full lg:w-1/3 flex flex-col gap-4">
            {tools.map((tool, i) => {
              const Icon = tool.icon;
              const isActive = activeTab === i;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTab(i)}
                  className={`group relative p-8 rounded-[2.5rem] text-left transition-all duration-500 border overflow-hidden ${
                    isActive
                      ? 'bg-white/[0.03] border-white/10 shadow-2xl'
                      : 'bg-transparent border-transparent hover:bg-white/[0.02]'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                  )}

                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-primary text-white' : 'bg-white/5 text-gray-600 group-hover:text-white'}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-lg font-black uppercase tracking-widest transition-colors ${isActive ? 'text-white italic' : 'text-gray-600 group-hover:text-gray-400'}`}>
                        {tool.label}
                      </span>
                    </div>

                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <p className="text-sm font-bold text-gray-500 leading-relaxed">
                          {tool.desc}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {tool.features.map((feature) => (
                            <span key={feature} className="text-[9px] font-black uppercase tracking-widest text-primary/80 bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="w-full lg:w-2/3 perspective-1000">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.95 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative aspect-[16/10] glass-panel rounded-[3.5rem] border border-white/5 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)] group"
              >
                <div className="absolute inset-0 transition-transform duration-1000 group-hover:scale-105">
                  <img
                    src={tools[activeTab].image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#03000a] via-transparent to-transparent opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#03000a]/40 via-transparent to-transparent opacity-60" />
                </div>

                <div className="absolute top-8 left-8 flex gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-lg shadow-red-500/20" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-lg shadow-yellow-500/20" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-lg shadow-green-500/20" />
                </div>

                <div className="absolute bottom-10 right-10 p-6 rounded-3xl bg-black/40 backdrop-blur-3xl border border-white/5 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center animate-spin-slow">
                      <Zap className="w-5 h-5 text-white fill-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">AI Studio</p>
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Live workspace module</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  );
}
