import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Box, Download, Camera, RotateCcw, Loader2, Sparkles, 
  Grid3x3, Move3d, Layers, Play, Square, ChevronRight
} from 'lucide-react';

import ThreeViewer from '../../ai_components/meshy/viewer/ThreeViewer';
import { setCameraPreset } from '../../ai_components/meshy/viewer/threeHelpers';
import { IconBtn, Tooltip } from '../../ai_components/meshy/ui/Primitives';
import LightingControls from '../../ai_components/meshy/viewer/LightingControls';
import { 
  VIEW_MODES, WireframeControl, BgColorPicker 
} from '../../ai_components/trellis';

export default function TrellisWorkspace({ 
  modelUrl, 
  genStatus, 
  activeItem,
  onDownload,
  onCameraReset
}) {
  const [viewMode, setViewMode] = useState("clay");
  const [showGrid, setShowGrid] = useState(true);
  const [bgColor, setBgColor] = useState("grayish");
  
  // HUD States (from Tripo style)
  const [lightMode, setLightMode] = useState("studio");
  const [lStr, setLStr] = useState(1.4);
  const [lRot, setLRot] = useState(0);
  const [lAutoR, setLAutoR] = useState(false);
  const [lAutoS, setLAutoS] = useState(0.5);
  const [dramC, setDramC] = useState("#ffffff");
  const [gc1, setGc1] = useState("#1e1e3a");
  const [gc2, setGc2] = useState("#111128");
  const [autoSpin, setAutoSpin] = useState(true);
  const [wireOv, setWireOv] = useState(false);
  const [wireOp, setWireOp] = useState(0.22);
  const [wireHex, setWireHex] = useState(0xffffff);
  
  const sceneRef = useRef(null);
  const isPending = genStatus === "pending";
  const color = "#a78bfa";

  const camP = (p) => {
    if (sceneRef.current) {
      setCameraPreset(sceneRef.current, p);
      setAutoSpin(p === "reset");
      sceneRef.current.autoSpin = p === "reset";
    }
  };

  const PBar = ({ value }) => (
    <div className="w-full h-[3px] rounded-full bg-white/10 overflow-hidden mt-6">
       <motion.div 
         initial={{ width: 0 }}
         animate={{ width: `${value}%` }}
         className="h-full bg-gradient-to-r from-primary to-cyan-400"
       />
    </div>
  );

  return (
    <div className="relative h-full flex flex-col bg-[#0a0a0f] overflow-hidden">
      
      {/* ── TOP HUD: Integrated Control Bar ── */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-2xl z-40 relative">
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mr-4 italic">View Orbit</span>
           {VIEW_MODES.map(v => (
             <Tooltip key={v.id} text={v.tip} side="bottom">
               <button 
                 onClick={() => setViewMode(v.id)} 
                 className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                   viewMode === v.id ? 'bg-primary/20 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-primary/30' : 'text-zinc-600 hover:text-zinc-400'
                 }`}
               >
                 {v.label}
               </button>
             </Tooltip>
           ))}
           <div className="w-px h-5 bg-white/5 mx-2" />
           {modelUrl && (
             <WireframeControl 
               active={wireOv} 
               onToggle={() => setWireOv(!wireOv)} 
               opacity={wireOp} 
               onOpacityChange={setWireOp} 
               color={wireHex} 
               onColorChange={setWireHex} 
               accentColor={color} 
             />
           )}
        </div>

        <div className="flex items-center gap-4">
           <BgColorPicker value={bgColor} onChange={setBgColor} />
           <div className="w-px h-5 bg-white/5" />
           <LightingControls 
             viewMode={viewMode} 
             lightMode={lightMode} setLightMode={setLightMode} 
             lightStrength={lStr} setLightStrength={setLStr} 
             lightRotation={lRot} setLightRotation={setLRot} 
             lightAutoRotate={lAutoR} setLightAutoRotate={setLAutoR} 
             lightAutoRotateSpeed={lAutoS} setLightAutoRotateSpeed={setLAutoS} 
             dramaticColor={dramC} setDramaticColor={setDramC} 
             gridColor1={gc1} setGridColor1={setGc1} 
             gridColor2={gc2} setGridColor2={setGc2} 
             color={color} 
           />
           <div className="w-px h-5 bg-white/5" />
           <IconBtn 
             icon={<Grid3x3 className="w-4 h-4" />} 
             tip="Toggle Grid" 
             active={showGrid} 
             color={color} 
             onClick={() => setShowGrid(!showGrid)} 
           />
        </div>
      </div>

      {/* ── Main Viewport ── */}
      <div className="flex-1 relative overflow-hidden bg-[#050508]">
        {/* Cinematic Backdrop Gradient */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] opacity-20"
                style={{ background: 'radial-gradient(circle, #3b82f630 0%, transparent 70%)' }} />
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,15,35,1)_0%,rgba(5,5,10,1)_100%)]" />
        </div>
        
        {/* Loading / Processing Overlay */}
        <AnimatePresence>
          {isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-3xl flex flex-col items-center justify-center text-center p-10"
            >
               <div className="relative group">
                  <div className="w-24 h-24 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(139,92,246,0.2)] animate-pulse">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="absolute -inset-4 rounded-full border border-dashed border-white/5"
                  />
               </div>
               
               <h2 className="text-3xl font-black text-white italic tracking-[0.2em] uppercase mb-4">Spatial Forge Active</h2>
               <p className="text-primary/60 max-w-sm font-bold text-[10px] uppercase tracking-[0.4em] leading-relaxed mb-8 opacity-80">Assembling neural voxels into high-fidelity mesh clusters</p>
               
               <div className="w-64">
                 <PBar value={45} /> {/* Sample value, usually managed by logic */}
                 <p className="text-[10px] font-mono text-zinc-600 mt-4 tracking-widest uppercase">Initializing Slat-Sampling v2.0</p>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!modelUrl && !isPending && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 pointer-events-none">
             <div className="w-24 h-24 rounded-[2.5rem] bg-white/[0.01] border border-white/5 flex items-center justify-center mb-10">
                <Box className="w-10 h-10 text-zinc-900" />
             </div>
             <h2 className="text-2xl font-black text-zinc-800 italic tracking-[0.4em] uppercase mb-4 opacity-50">Void Space Zero.</h2>
             <p className="text-zinc-900/40 max-w-sm font-black text-[9px] uppercase tracking-[0.5em] italic">Execute spatial directive to inhabit viewport</p>
          </div>
        )}

        {/* 3D Viewer Instance */}
        <div className="absolute inset-0">
           <ThreeViewer 
             modelUrl={modelUrl}
             viewMode={viewMode}
             lightMode={lightMode}
             showGrid={showGrid}
             bgColor={bgColor}
             lightStrength={lStr}
             lightRotation={lRot}
             lightAutoRotate={lAutoR}
             lightAutoRotateSpeed={lAutoS}
             dramaticColor={dramC}
             wireframeOverlay={wireOv}
             wireOpacity={wireOp}
             wireHexColor={wireHex}
             autoSpin={autoSpin}
             gridColor1={gc1}
             gridColor2={gc2}
             onSpinStop={() => setAutoSpin(false)}
             onReady={(s) => { sceneRef.current = s; }}
             color={color}
           />
        </div>

        {/* ── BOTTOM HUD: Camera & Tools ── */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-40">
           <div className="bg-[#0a0a0f]/60 backdrop-blur-3xl px-4 py-2.5 rounded-2xl border border-white/5 flex items-center gap-5 shadow-2xl">
              <div className="flex items-center gap-2 pr-4 border-r border-white/5">
                <IconBtn icon={<RotateCcw className="w-4 h-4" />} tip="Reset Camera" onClick={() => camP("reset")} />
                <IconBtn icon={<Camera className="w-4 h-4" />}    tip="Front View"    onClick={() => camP("front")} />
                <IconBtn icon={<Move3d className="w-4 h-4" />}    tip="Side View"     onClick={() => camP("side")} />
                <IconBtn icon={<Layers className="w-4 h-4" />}    tip="Top View"      onClick={() => camP("top")} />
              </div>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setAutoSpin(!autoSpin)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  autoSpin ? 'bg-primary text-white shadow-[0_0_25px_rgba(139,92,246,0.4)]' : 'bg-white/5 text-zinc-600 border border-white/5 hover:text-white'
                }`}
              >
                {autoSpin ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {autoSpin ? "Stop Spinner" : "Start Spinner"}
              </motion.button>

              <div className="w-px h-5 bg-white/5 mx-1" />

              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.95 }}
                onClick={onDownload}
                className="flex items-center gap-2.5 px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest shadow-xl"
              >
                <Download className="w-3.5 h-3.5" />
                Production Export
              </motion.button>
           </div>
        </div>

        {/* Model Identifier Flag */}
        {activeItem && !isPending && (
          <div className="absolute top-20 left-10 flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
             <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic">Active Node: {activeItem.name || 'Nexus Alpha'}</p>
          </div>
        )}
      </div>

      {/* Model Tech Info Banner (Bottom edge) */}
      {activeItem && !isPending && (
        <div className="h-10 bg-[#0a0a0f] border-t border-white/5 px-6 flex items-center justify-between relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-50" />
           <p className="relative z-10 text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600 italic flex items-center gap-2">
             <div className="w-2 h-0.5 bg-primary/30" />
             Spatial Logic Stream v2.4.0
           </p>
           <div className="flex items-center gap-8 relative z-10">
              <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
                Neural Precision: <span className="text-emerald-500/60">Optimized</span>
              </span>
              <div className="w-[1px] h-3 bg-white/5" />
              <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">
                Latency: <span className="text-zinc-500">14ms</span>
              </span>
           </div>
        </div>
      )}
    </div>
  );
}

