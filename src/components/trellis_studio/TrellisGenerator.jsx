import React, { useState } from 'react';
import { Box, Settings2 } from 'lucide-react';
import { useTrellisLogic } from '../../hooks/useTrellisLogic';
import TrellisControls from './TrellisControls';
import TrellisWorkspace from './TrellisWorkspace';
import Shared3DHistory from '../shared/Shared3DHistory';
import StudioLayout from '../shared/StudioLayout';

export default function TrellisGenerator({ getIdToken, userId, isGlobalOpen, toggleGlobalSidebar }) {
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

  const [leftOpen, setLeftOpen] = useState(true);
  const [leftSecondaryOpen, setLeftSecondaryOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [offsets, setOffsets] = useState({ left: 320, right: 280 });

  // Master Sidebar Sync
  React.useEffect(() => {
    setLeftOpen(isGlobalOpen);
  }, [isGlobalOpen]);

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
      leftWidth={72}
      leftSecondaryWidth={320}
      rightWidth={280}
      onOffsetChange={setOffsets}
      leftSidebar={
        <div className="h-full flex flex-col items-center pt-6 bg-[#030308] border-r border-white/5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg mb-8"
            style={{ backgroundColor: "#60a5fa15", borderColor: "#60a5fa30", color: "#60a5fa" }}
            title="Trellis Studio"
          >
            <Box className="w-6 h-6" />
          </div>
          
          <button
            onClick={() => setLeftSecondaryOpen(!leftSecondaryOpen)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
              leftSecondaryOpen 
                ? "bg-white/10 border-white/20 text-white shadow-lg shadow-white/5" 
                : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400"
            }`}
            style={leftSecondaryOpen ? { borderColor: "#60a5fa40", color: "#60a5fa" } : {}}
            title="Trellis Generation Controls"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      }
      leftSecondarySidebar={
        <div className="h-full overflow-hidden bg-[#060410]/60 backdrop-blur-3xl border-r border-white/5">
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
      }
      rightSidebar={
        <Shared3DHistory
          userId={userId}
          getIdToken={getIdToken}
          color="#60a5fa"
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
