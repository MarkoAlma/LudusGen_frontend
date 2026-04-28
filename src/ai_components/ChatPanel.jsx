import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen, Layout } from 'lucide-react';
import { MyUserContext } from '../context/MyUserProvider';
import { useChatLogic } from '../hooks/useChatLogic';
import { findModelGroup } from './models';
import ModelBar from '../components/chat/ModelBar';
import MessageList from '../components/chat/MessageList';
import WelcomeScreen from '../components/chat/WelcomeScreen';
import ChatInput from '../components/chat/ChatInput';
import ChatSidebar from '../components/chat/ChatSidebar';
import ConfigPanel from '../components/chat/ConfigPanel';
import ChatAtmosphere from '../components/chat/ChatAtmosphere';
import SummaryIndicator from '../components/chat/SummaryIndicator';

import StudioLayout from '../components/shared/StudioLayout';
import { useStudioPanels } from '../context/StudioPanelContext';

// Shared layout constant — all content aligns to this max-width
const CONTENT_MAX_W = 'max-w-3xl';
const HISTORY_SIDEBAR_W = 288; // px, matches w-72
const SIDEBAR_W = 320; // AiStudioSidebar width

export default function ChatPanel({ selectedModel, userId, getIdToken, isGlobalOpen, toggleGlobalSidebar, globalSidebar, onModelChange, initialDropdownOpen = false, onNewChatWithPicker, openChatSessionRequest, onActiveChatSessionChange, isJobForeground }) {
  const { registerPanel, unregisterPanel } = useStudioPanels();

  // Register panels (Chat has L1 + R, no L2)
  useEffect(() => {
    registerPanel('L1');
    registerPanel('R');
    return () => {
      unregisterPanel('L1');
      unregisterPanel('R');
    };
  }, [registerPanel, unregisterPanel]);
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
    loadingConversationList,
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
    createNewSession,
    handleStop,
    isSummarizing,
    switchSession,
    deleteSession,
    renameSession,
    loadConversationList,
    hasMore,
    isLoadingMore,
    sessionId,
  } = useChatLogic(selectedModel, userId, getIdToken, onModelChange, isJobForeground);

  useEffect(() => {
    if (!openChatSessionRequest?.sessionId) return;
    switchSession(openChatSessionRequest.sessionId);
  }, [openChatSessionRequest?.requestId]);

  useEffect(() => {
    onActiveChatSessionChange?.(sessionId);
    return () => onActiveChatSessionChange?.(null);
  }, [sessionId, onActiveChatSessionChange]);

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
            loadingHistory={loadingConversationList}
            onSelectSession={(id) => {
              switchSession(id);
            }}
            onDeleteSession={deleteSession}
            onRenameSession={renameSession}
            onLoadMore={() => loadConversationList(true)}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
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
        {/* Main Interface Area */}
        <div className="flex-1 flex flex-col min-w-0 relative h-full z-10 px-0 max-w-full">

          {/* Top Fade Mask replacing the old Header */}
          <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#03000a] via-[#03000a]/80 to-transparent z-30 pointer-events-none" />

          {/* Scrollable message area */}
          <div className="flex-1 relative overflow-hidden">
            {!loadingHistory && messages.length === 0 ? (
              <WelcomeScreen 
                themeColor={themeColor} 
                selectedModel={selectedModel}
                onSuggestionClick={handleSend}
              />
            ) : (
              <div ref={chatScrollRef} className="h-full overflow-y-auto scrollbar-thin px-3 sm:px-6 lg:px-12">
                <div className="w-full pt-24 pb-32 flex flex-col items-center space-y-4">
                  <MessageList
                    messages={messages}
                    loadingHistory={loadingHistory}
                    selectedModel={selectedModel}
                    onSuggestionClick={handleSend}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Input area — floats over the message list */}
          <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-t from-[#03000a]/90 via-[#03000a]/40 to-transparent" />
            <div className="relative pointer-events-auto px-3 sm:px-6 lg:px-12 pb-6 pt-8 flex flex-col items-center">
              <SummaryIndicator isVisible={isSummarizing} />
              <div className="w-full max-w-3xl flex flex-col items-center">

              {/* Floating Toolbar (Model Bar & Config) - On Top */}
              <div className="w-full mb-2 lg:mb-3 px-1">
                <ModelBar
                  selectedModel={selectedModel}
                  setHistorySidebarOpen={() => setHistorySidebarOpen(true)}
                  onConfigOpen={() => setConfigOpen(true)}
                  navHeight={navHeight}
                  historySidebarOpen={historySidebarOpen}
                  isDesktop={isDesktop}
                  sidebarCollapsed={!isGlobalOpen}
                  onModelSwitch={(newModel) => onModelChange?.(newModel)}
                  onNewChat={() => { createNewSession(); onNewChatWithPicker?.(); }}
                  initialDropdownOpen={initialDropdownOpen}
                />
              </div>

              {/* Standalone Premium Chat Input */}
              <div className="w-full">
                <ChatInput
                  input={input}
                  setInput={setInput}
                  isTyping={isTyping}
                  handleSend={handleSend}
                  handleStop={handleStop}
                  attachedImage={attachedImage}
                  setAttachedImage={setAttachedImage}
                  textareaRef={textareaRef}
                />
              </div>

              </div>
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
      </div>
    </StudioLayout>
  );
}
