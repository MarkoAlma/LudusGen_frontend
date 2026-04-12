import React, { useState } from 'react';
import { useTrellisLogic } from '../../hooks/useTrellisLogic';
import TrellisControls from './TrellisControls';
import TrellisWorkspace from './TrellisWorkspace';
import Shared3DHistory from '../shared/Shared3DHistory';
import StudioLayout from '../shared/StudioLayout';

export default function TrellisGenerator({ getIdToken, userId, isGlobalOpen }) {
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
      setLeftOpen={setLeftOpen}
      rightOpen={rightOpen}
      setRightOpen={setRightOpen}
      leftWidth={320}
      rightWidth={280}
      onOffsetChange={setOffsets}
      leftSidebar={
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
