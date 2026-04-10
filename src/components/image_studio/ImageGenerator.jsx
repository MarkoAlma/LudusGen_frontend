import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2 } from 'lucide-react';
import ImageControls from './ImageControls';
import ImageWorkspace from './ImageWorkspace';
import ImageStudioBG from '../../assets/image_studio_v2.png';
import BackgroundFilters from '../chat/BackgroundFilters';

export default function ImageGenerator({ selectedModel, userId, getIdToken }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError] = useState(null);
  const [inputImages, setInputImages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("balanced");
  const [numImages, setNumImages] = useState(1);
  const [seed, setSeed] = useState("");
  const [steps, setSteps] = useState(35);
  const [guidance, setGuidance] = useState(3);
  const [promptExtend, setPromptExtend] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const themeColor = selectedModel?.color || "#7c3aed";

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setSidebarOpen(false); 
    
    try {
      const token = await getIdToken();
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
      
      const res = await fetch(`${API_BASE}/api/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider: selectedModel.provider,
          apiId: selectedModel.apiModel,
          negative_prompt: negativePrompt.trim() || undefined,
          aspect_ratio: aspectRatio,
          num_images: numImages,
          seed: seed ? parseInt(seed) : undefined,
          num_inference_steps: steps,
          prompt_extend: promptExtend,
          guidance_scale: guidance,
          ...(selectedModel.needsInputImage && inputImages.length > 0 ? { input_images: inputImages.map(img => img.dataUrl) } : {}),
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Hiba történt");
      setGeneratedImages(data.images || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full bg-[#03000a] text-white overflow-hidden relative selection:bg-primary/30">
      <BackgroundFilters />

      {/* Cinematic Background Layer — Enhanced High-Fidelity Look */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
         {/* Base Image with Liquid Wave Distortion & Ken Burns Effect */}
         <div className="absolute inset-0 liquid-wave opacity-60 scale-110 animate-[ken-burns_60s_infinite_alternate_ease-in-out]">
            <img src={ImageStudioBG} alt="bg" className="w-full h-full object-cover saturate-[1.2] brightness-[0.8]" />
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

      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-32 right-6 z-[60] lg:hidden w-16 h-16 rounded-full bg-primary text-white shadow-[0_20px_40px_rgba(138,43,226,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-primary/20"
      >
        <Settings2 className="w-7 h-7" />
      </button>

      {/* Sidebar - Desktop & Mobile Drawer */}
      <AnimatePresence>
        {(sidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
          <>
            {/* Backdrop for Mobile */}
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   onClick={() => setSidebarOpen(false)}
                   className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] lg:hidden"
                />
              )}
            </AnimatePresence>
            
            <motion.div 
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`
                fixed inset-y-0 left-0 z-[110] 
                w-80 xl:w-96
                lg:relative lg:z-0 h-full 
                border-r border-white/5 
                flex flex-col bg-[#03000a]/20 backdrop-blur-[60px] 
                overflow-hidden
              `}
            >
              <ImageControls 
                selectedModel={selectedModel}
                prompt={prompt} setPrompt={setPrompt}
                negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
                aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
                quality={quality} setQuality={setQuality}
                numImages={numImages} setNumImages={setNumImages}
                seed={seed} setSeed={setSeed}
                steps={steps} setSteps={setSteps}
                guidance={guidance} setGuidance={setGuidance}
                promptExtend={promptExtend} setPromptExtend={setPromptExtend}
                inputImages={inputImages} setInputImages={setInputImages}
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Center/Right: Generation Workspace */}
      <div className="flex-1 h-full relative overflow-hidden z-10">
        <ImageWorkspace 
          isGenerating={isGenerating}
          images={generatedImages}
          error={error}
          selectedModel={selectedModel}
        />
      </div>
    </div>
  );
}
