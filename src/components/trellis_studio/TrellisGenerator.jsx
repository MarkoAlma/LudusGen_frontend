import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrellisLogic } from '../../hooks/useTrellisLogic';
import TrellisControls from './TrellisControls';
import TrellisWorkspace from './TrellisWorkspace';
import TrellisHistory from './TrellisHistory';
import { PanelLeft, PanelRight, Layout } from 'lucide-react';

export default function TrellisGenerator({ getIdToken, userId }) {
  const {
    prompt, setPrompt,
    genStatus, setGenStatus,
    errorMsg, setErrorMsg,
    modelUrl, setModelUrl,
    params, setParams,
    selectedStyle, setSelectedStyle,
    history,
    activeItem, setActiveItem,
    handleGenerate,
    handleStop
  } = useTrellisLogic(userId, getIdToken);

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div className="flex h-full overflow-hidden bg-transparent text-white relative">
      {/* Left Sidebar: Controls */}
      <AnimatePresence mode="popLayout">
        {leftOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 relative z-10 border-r border-white/5"
            style={{ background: "rgba(3,0,10,0.2)", backdropFilter: "blur(60px)" }}
          >
            <div className="pt-20 lg:pt-24 h-full flex flex-col overflow-y-auto" style={{ width: 320 }}>
              <TrellisControls 
                prompt={prompt} 
                setPrompt={setPrompt}
                selectedStyle={selectedStyle}
                setSelectedStyle={setSelectedStyle}
                params={params}
                setParams={setParams}
                onGenerate={handleGenerate}
                isRunning={genStatus === 'pending'}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content: Workspace */}
      <div className="flex-1 min-w-0 flex flex-col relative z-[1]">
        <TrellisWorkspace 
          modelUrl={modelUrl}
          genStatus={genStatus}
          activeItem={activeItem}
          onDownload={() => {}}
          onCameraReset={() => {}}
        />

      </div>

      {/* Right Sidebar: History */}
      <AnimatePresence mode="popLayout">
        {rightOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 relative z-10 border-l border-white/5"
            style={{ background: "rgba(3,0,10,0.2)", backdropFilter: "blur(60px)" }}
          >
            <div className="pt-20 lg:pt-24 h-full flex flex-col overflow-y-auto" style={{ width: 280 }}>
              <TrellisHistory 
                history={history}
                activeItemId={activeItem?.id}
                onSelectItem={(item) => {
                  setActiveItem(item);
                  setModelUrl(item.model_url);
                  setGenStatus('succeeded');
                }}
                onDeleteItem={() => {}}
                onClearHistory={() => {}}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
