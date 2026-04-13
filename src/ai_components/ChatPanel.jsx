import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen, Layout } from 'lucide-react';
import { MyUserContext } from '../context/MyUserProvider';
import { useChatLogic } from '../hooks/useChatLogic';
import { findModelGroup } from './models';
import ChatHeader from '../components/chat/ChatHeader';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';
import ChatSidebar from '../components/chat/ChatSidebar';
import ConfigPanel from '../components/chat/ConfigPanel';
import ChatAtmosphere from '../components/chat/ChatAtmosphere';

import StudioLayout from '../components/shared/StudioLayout';

// Shared layout constant — all content aligns to this max-width
const CONTENT_MAX_W = 'max-w-3xl';
const HISTORY_SIDEBAR_W = 288; // px, matches w-72
const SIDEBAR_W = 320; // AiStudioSidebar width

export default function ChatPanel({ selectedModel, userId, getIdToken, setSidebarOpen, isGlobalOpen, toggleGlobalSidebar, globalSidebar }) {
  const group = findModelGroup(selectedModel?.id);
  const themeColor = selectedModel?.color || "#8b5cf6";
  const { navHeight } = useContext(MyUserContext);

  const {
    messages,
    input,
    setInput,
    isTyping,
    handleSend,
    attachedImage,
    setAttachedImage,
    loadingHistory,
    conversations,
    chatScrollRef,
    textareaRef,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    topP,
    setTopP,
    frequencyPenalty,
    setFrequencyPenalty,
    presencePenalty,
    setPresencePenalty,
    systemPrompt,
    setSystemPrompt,
    presets,
    activePresetId,
    applyPreset,
    onEnhance,
    onDechant,
  } = useChatLogic(selectedModel, userId, getIdToken);

  const [historySidebarOpen, setHistorySidebarOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  const [offsets, setOffsets] = useState({ left: 320, right: 0 });

  useEffect(() => {
    const checkSize = () => {
      const desktop = window.innerWidth >= 1280;
      setIsDesktop(desktop);
      // On mobile, start collapsed
      if (!desktop) setHistorySidebarOpen(false);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return (
    <StudioLayout
      leftOpen={isGlobalOpen}
      setLeftOpen={toggleGlobalSidebar}
      leftSidebar={globalSidebar}
      leftWidth={320}
      leftSecondarySidebar={null}
      rightOpen={historySidebarOpen}
      setRightOpen={setHistorySidebarOpen}
      rightSidebar={
        <div className="h-full flex flex-col overflow-hidden">
          <ChatSidebar
            conversations={conversations}
            loadingHistory={loadingHistory}
            onSelectSession={(id) => {
              sessionStorage.setItem(`chat_session_${selectedModel.id}`, id);
              window.location.reload();
            }}
            onClose={() => setHistorySidebarOpen(false)}
          />
        </div>
      }
      rightWidth={288}
      onOffsetChange={setOffsets}
    >
      <div className="flex flex-1 w-full h-full bg-[#03000a] text-white overflow-hidden relative">

        {/* ── Cinematic Atmosphere Layer ── */}
        <ChatAtmosphere themeColor={themeColor} />

        {/* ── Main Chat Area ── */}
        <div className="flex-1 flex flex-col min-w-0 relative h-full z-10 px-0">

          {/* Header */}
          <ChatHeader
            selectedModel={selectedModel}
            setSidebarOpen={setSidebarOpen}
            setHistorySidebarOpen={() => setHistorySidebarOpen(true)}
            onConfigOpen={() => setConfigOpen(true)}
            navHeight={navHeight}
            historySidebarOpen={historySidebarOpen}
            isDesktop={isDesktop}
            sidebarCollapsed={!isGlobalOpen}
          />

          {/* Scrollable message area */}
          <div className="flex-1 relative overflow-hidden">
            <div ref={chatScrollRef} className="h-full overflow-y-auto scrollbar-thin scroll-smooth w-full px-3 sm:px-6 lg:px-12">
              <div 
                className="w-full pb-8 flex flex-col space-y-4 pt-24" 
              >
                <MessageList
                  messages={messages}
                  loadingHistory={loadingHistory}
                  selectedModel={selectedModel}
                  onSuggestionClick={(text) => {
                    setInput(text);
                    setTimeout(() => {
                      textareaRef?.current?.focus();
                    }, 50);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Input area */}
          <div className="w-full px-3 sm:px-6 lg:px-12 pb-6 pt-1">
            <ChatInput
                input={input}
                setInput={setInput}
                isTyping={isTyping}
                handleSend={handleSend}
                attachedImage={attachedImage}
                setAttachedImage={setAttachedImage}
                textareaRef={textareaRef}
              />
          </div>
        </div>

        {/* ── Config Panel ── */}
        <ConfigPanel
          isOpen={configOpen}
          onClose={() => setConfigOpen(false)}
          temperature={temperature}
          setTemperature={setTemperature}
          maxTokens={maxTokens}
          setMaxTokens={setMaxTokens}
          topP={topP}
          setTopP={setTopP}
          frequencyPenalty={frequencyPenalty}
          setFrequencyPenalty={setFrequencyPenalty}
          presencePenalty={presencePenalty}
          setPresencePenalty={setPresencePenalty}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          themeColor={themeColor}
          navHeight={navHeight}
          selectedModelId={selectedModel?.id}
          presets={presets}
          activePresetId={activePresetId}
          applyPreset={applyPreset}
          onEnhance={onEnhance}
          onDechant={onDechant}
        />
      </div>
    </StudioLayout>
  );
}
