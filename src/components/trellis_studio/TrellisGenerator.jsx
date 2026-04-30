import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTrellisLogic } from '../../hooks/useTrellisLogic';
import { fetchGlbAsBlob } from '../../ai_components/trellis/utils';
import TrellisControls from './TrellisControls';
import TrellisWorkspace from './TrellisWorkspace';
import Shared3DHistory from '../shared/Shared3DHistory';
import StudioLayout from '../shared/StudioLayout';
import { useStudioPanels } from '../../context/StudioPanelContext';

export default function TrellisGenerator({ getIdToken, userId, isGlobalOpen, toggleGlobalSidebar, globalSidebar }) {
  const { registerPanel, unregisterPanel } = useStudioPanels();
  const [searchParams, setSearchParams] = useSearchParams();
  const tripoTaskIdParam = searchParams.get("tripoTaskId");

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
    setErrorMsg,
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
  useEffect(() => { setLeftOpen(isGlobalOpen); }, [isGlobalOpen]);

  const [leftSecondaryOpen, setLeftSecondaryOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [offsets, setOffsets] = useState({ left: 320, right: 280 });
  const [historyItems, setHistoryItems] = useState([]);
  const selectedHistoryBlobRef = useRef(null);

  const defaultHistoryTab = useMemo(() => tripoTaskIdParam ? 'tripo' : 'trellis', [tripoTaskIdParam]);

  const revokeSelectedHistoryBlob = useCallback(() => {
    if (!selectedHistoryBlobRef.current) return;
    URL.revokeObjectURL(selectedHistoryBlobRef.current);
    selectedHistoryBlobRef.current = null;
  }, []);

  useEffect(() => () => {
    revokeSelectedHistoryBlob();
  }, [revokeSelectedHistoryBlob]);

  const syncHistoryTaskInUrl = useCallback((item) => {
    setSearchParams(prev => {
      const n = new URLSearchParams(prev);
      if (item?.source === 'tripo' && item?.taskId) {
        n.set("tripoTaskId", item.taskId);
      } else {
        n.delete("tripoTaskId");
      }
      return n;
    }, { replace: true });
  }, [setSearchParams]);

  const handleHistorySelect = useCallback(async (item) => {
    setActiveItem(item);
    setGenStatus(item?.status || 'succeeded');
    setErrorMsg("");
    syncHistoryTaskInUrl(item);

    if (!item?.model_url) {
      revokeSelectedHistoryBlob();
      setModelUrl(null);
      return;
    }

    try {
      const nextModelUrl = await fetchGlbAsBlob(item.model_url, getIdToken, item.taskId);
      revokeSelectedHistoryBlob();
      selectedHistoryBlobRef.current = nextModelUrl?.startsWith?.('blob:') ? nextModelUrl : null;
      setModelUrl(nextModelUrl);
    } catch (error) {
      revokeSelectedHistoryBlob();
      setModelUrl(null);
      setGenStatus('failed');
      setErrorMsg(error?.message || "Model loading failed");
    }
  }, [
    getIdToken,
    revokeSelectedHistoryBlob,
    setActiveItem,
    setErrorMsg,
    setGenStatus,
    setModelUrl,
    syncHistoryTaskInUrl,
  ]);

  useEffect(() => {
    if (!tripoTaskIdParam) return;
    if (activeItem?.taskId === tripoTaskIdParam) return;
    const item = historyItems.find((entry) => entry.taskId === tripoTaskIdParam || entry.id === tripoTaskIdParam);
    if (!item) return;
    void handleHistorySelect(item);
  }, [activeItem?.taskId, handleHistorySelect, historyItems, tripoTaskIdParam]);

  const handleGenerateWrap = async () => {
    revokeSelectedHistoryBlob();
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
      hideLeftSecondaryToggle
      onOffsetChange={setOffsets}
      leftSidebar={globalSidebar}
      leftSecondarySidebar={
        <div className="h-full overflow-hidden bg-[#060410]/60 backdrop-blur-3xl border-r border-white/5">
          <div className="h-full overflow-hidden">
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
          key={defaultHistoryTab}
          userId={userId}
          getIdToken={getIdToken}
          color="#60a5fa"
          defaultTab={defaultHistoryTab}
          firestoreCollectionsByTab={{
            tripo: 'tripo_history',
            trellis: 'trellis_history',
            upload: 'tripo_history',
          }}
          activeItemId={activeItem?.id}
          refreshTrigger={refreshTrigger}
          onSelect={handleHistorySelect}
          onHistoryLoad={setHistoryItems}
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
