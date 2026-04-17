import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Settings, Sparkles, Layers, Paintbrush2, Wand2, RefreshCw, PersonStanding } from 'lucide-react';
import { useTrellisLogic } from '../../hooks/useTrellisLogic';
import TrellisControls from './TrellisControls';
import TrellisWorkspace from './TrellisWorkspace';
import Shared3DHistory from '../shared/Shared3DHistory';
import StudioLayout from '../shared/StudioLayout';
import { useStudioPanels } from '../../context/StudioPanelContext';

export default function TrellisGenerator({ getIdToken, userId, isGlobalOpen, toggleGlobalSidebar, globalSidebar }) {
  const { registerPanel, unregisterPanel, togglePanel } = useStudioPanels();

  // Register panels with centralized manager
  useEffect(() => {
    registerPanel('L1');
    registerPanel('L2');
    registerPanel('R');
    return () => {
      unregisterPanel('L1');
      unregisterPanel('L2');
      unregisterPanel('R');
    };
  }, [registerPanel, unregisterPanel]);
  const {
    prompt, setPrompt,
    genStatus, setGenStatus,
    modelUrl, setModelUrl,
    params, setParams,
    selectedStyle, setSelectedStyle,
    activeItem, setActiveItem,
    handleGenerate,
    enhancing,
    enhanceError,
    handleEnhance,
    handleDechant,
    customPreset,
    handleSaveCustomPreset
  } = useTrellisLogic(userId, getIdToken);

  const color = '#8b5cf6';

  const [leftOpen, setLeftOpen] = useState(true);
  useEffect(() => { setLeftOpen(isGlobalOpen); }, [isGlobalOpen]);

  const [leftSecondaryOpen, setLeftSecondaryOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [offsets, setOffsets] = useState({ left: 320, right: 280 });

  const handleGenerateWrap = async () => {
    await handleGenerate();
    setRefreshTrigger(p => p + 1);
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
      leftSecondaryWidth={392}
      leftSecondaryClosedWidth={0}
      rightWidth={280}
      onOffsetChange={setOffsets}
      leftSidebar={globalSidebar}
      leftSecondarySidebar={
        <div className="h-full flex flex-row overflow-hidden bg-[#060410]/60 backdrop-blur-3xl border-r border-white/5">
          {/* Tool Strip (72px) - Now persistent when collapsed */}
          <div className="w-[72px] h-full flex flex-col items-center pt-6 space-y-4 border-r border-white/5 bg-[#030308]">
            {[
              { id: 'model', label: 'MODEL', icon: <Sparkles className="w-5 h-5" />, color },
              { id: 'segment', label: 'SEGMENT', icon: <Box className="w-5 h-5" />, color: '#94a3b8' },
              { id: 'retopo', label: 'RETOPO', icon: <Layers className="w-5 h-5" />, color: '#94a3b8' },
              { id: 'texture', label: 'TEXTURE', icon: <Paintbrush2 className="w-5 h-5" />, color: '#94a3b8' },
              { id: 'edit', label: 'EDIT', icon: <Wand2 className="w-5 h-5" />, color: '#94a3b8' },
              { id: 'refine', label: 'REFINE', icon: <RefreshCw className="w-5 h-5" />, color: '#94a3b8' },
              { id: 'stylize', label: 'STYLIZE', icon: <Sparkles className="w-5 h-5" />, color: '#94a3b8' },
              { id: 'animate', label: 'ANIMATE', icon: <PersonStanding className="w-5 h-5" />, color: '#94a3b8' },
            ].map((tool, idx) => (
              <button
                key={tool.id}
                className={`group flex flex-col items-center gap-1.5 transition-all duration-300 border-none bg-transparent cursor-pointer ${idx === 0 ? 'mb-4' : ''}`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border ${idx === 0
                    ? "bg-white/5 border-white/10 shadow-xl"
                    : "bg-transparent border-transparent"
                    }`}
                  style={idx === 0 ? { borderColor: `${tool.color}40`, color: tool.color } : { color: '#52525b' }}
                >
                  {tool.icon}
                </div>
                <AnimatePresence mode="wait">
                  {leftSecondaryOpen && (
                    <motion.span
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`text-[8px] font-black tracking-[0.2em] transition-all duration-500 overflow-hidden ${idx === 0 ? 'text-white' : 'text-zinc-700'}`}
                    >
                      {tool.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            ))}

            <div className="flex-1" />

            <button
              onClick={() => setLeftSecondaryOpen(!leftSecondaryOpen)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border ${leftSecondaryOpen
                ? "bg-white/10 border-white/20 text-white shadow-lg"
                : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400"
                }`}
              title="Toggle Panel"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <TrellisControls
              prompt={prompt}
              setPrompt={setPrompt}
              selectedStyle={selectedStyle}
              setSelectedStyle={setSelectedStyle}
              params={params}
              setParams={setParams}
              onGenerate={handleGenerateWrap}
              isRunning={genStatus === 'pending'}
              enhancing={enhancing}
              enhanceError={enhanceError}
              onEnhance={handleEnhance}
              onDechant={handleDechant}
              customPreset={customPreset}
              handleSaveCustomPreset={handleSaveCustomPreset}
            />
          </div>
        </div>
      }
      rightSidebar={
        <Shared3DHistory
          userId={userId}
          getIdToken={getIdToken}
          color="#60a5fa"
          defaultTab="trellis"
          activeItemId={activeItem?.id}
          refreshTrigger={refreshTrigger}
          onSelect={(item) => {
            setActiveItem(item);
            setModelUrl(item.model_url);
            setGenStatus('succeeded');
          }}
          onReuse={(item) => {
            setPrompt(item.prompt);
          }}
          onDownload={() => { }}
        />
      }
    >
      <TrellisWorkspace
        modelUrl={modelUrl}
        genStatus={genStatus}
        activeItem={activeItem}
        onDownload={() => { }}
        onCameraReset={() => { }}
        leftOffset={offsets.left}
        rightOffset={offsets.right}
        leftWidth={320}
        rightWidth={280}
      />
    </StudioLayout>
  );
}
