import React, { useState, useCallback, useContext, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { ALL_MODELS, getModel, findModelGroup, findModelCat } from "./models";
import ChatPanel from "./ChatPanel";
import ImagePanel from "./ImagePanel";
import AudioPanel from "./AudioPanel";
import MeshyStudio from "./meshy/Meshy";
import TrellisPanel from "./trellis/TrellisPanel";
import TripoPanel from "./tripo/TripoPanel";
import { MyUserContext } from "../context/MyUserProvider";
import AiStudioSidebar from "../components/chat/AiStudioSidebar";
import BackgroundFilters from "../components/chat/BackgroundFilters";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { API_BASE } from "../api/client";

export default function AIChat({ user, getIdToken }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAI, setSelectedAI] = useState("claude_sonnet");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Desktop Sidebar Persistence & Motion
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('desktop_sidebar_open');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const smoothWidth = useSpring(desktopSidebarOpen ? 320 : 0, { damping: 38, stiffness: 180 });

  useEffect(() => {
    smoothWidth.set(desktopSidebarOpen ? 320 : 0);
  }, [desktopSidebarOpen, smoothWidth]);

  const toggleDesktopSidebar = useCallback(() => {
    setDesktopSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('desktop_sidebar_open', JSON.stringify(next));
      return next;
    });
  }, []);

  const [openGroups, setOpenGroups] = useState(() => new Set(["chat"]));
  const [openCats, setOpenCats] = useState(() => new Set(["chat_anthropic"]));
  const { navHeight } = useContext(MyUserContext);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const modelParam = searchParams.get("model");

    let modelId = modelParam;

    // If specific model not in URL, use tab defaults
    if (!modelId && tab) {
      if (tab === "image") modelId = "gemini-image";
      else if (tab === "audio") modelId = "nvidia_magpie_tts";
      else if (tab === "3d") modelId = "nvidia_trellis";
      else modelId = "claude_sonnet";
    }

    // Default fallback
    if (!modelId) modelId = "claude_sonnet";

    setSelectedAI(modelId);

    const gId = findModelGroup(modelId);
    const cId = findModelCat(modelId);
    if (gId) setOpenGroups(new Set([gId]));
    if (cId) setOpenCats(new Set([cId]));
  }, [searchParams]);

  const selectedModel = getModel(selectedAI) || ALL_MODELS[0];

  const handleSelectModel = useCallback((modelId) => {
    const oldModel = getModel(selectedAI);
    const newModel = getModel(modelId);

    // If both are chat panel types, keep the same conversation session
    const samePanelType = newModel?.panelType === oldModel?.panelType;

    if (samePanelType && newModel?.panelType === 'chat') {
      // Notify backend to generate summary for model switch
      const sessionId = sessionStorage.getItem("chat_session_current");
      if (sessionId) {
        getIdToken().then(token =>
          fetch(`${API_BASE}/api/chat/switch-model`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ sessionId, newModelId: modelId })
          }).catch(e => console.warn('[ModelSwitch] Failed:', e))
        );
      }

      // Just change the model, don't reset the conversation
      // Don't update URL — prevents re-render/refresh
      setSelectedAI(modelId);

      const gId = findModelGroup(modelId);
      const cId = findModelCat(modelId);
      if (gId) setOpenGroups((p) => new Set([...p, gId]));
      if (cId) setOpenCats((p) => new Set([...p, cId]));
      setSidebarOpen(false);
      setModelDropdownOpen(false);
      return;
    }

    // For different panel types, do the full reset
    setSelectedAI(modelId);

    // Sync URL tab parameter
    if (newModel) {
      let tab = "chat";
      if (newModel.panelType === "image") tab = "image";
      else if (newModel.panelType === "audio") tab = "audio";
      else if (["threed", "trellis", "tripo"].includes(newModel.panelType)) tab = "3d";

      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        next.set("model", modelId);
        return next;
      });
    }

    const gId = findModelGroup(modelId);
    const cId = findModelCat(modelId);
    if (gId) setOpenGroups((p) => new Set([...p, gId]));
    if (cId) setOpenCats((p) => new Set([...p, cId]));
    setSidebarOpen(false);
    setModelDropdownOpen(false);
  }, [setSearchParams, selectedAI]);

  const toggleGroup = useCallback((id) => {
    setOpenGroups((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const toggleCat = useCallback((id) => {
    setOpenCats((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const renderPanel = () => {
    const props = {
      selectedModel,
      userId: user?.uid,
      getIdToken,
      setSidebarOpen,
      isGlobalOpen: desktopSidebarOpen, // MASTER SYNC
      toggleGlobalSidebar: toggleDesktopSidebar,
      globalSidebar: (
        <AiStudioSidebar
          selectedAI={selectedAI}
          openGroups={openGroups}
          openCats={openCats}
          toggleGroup={toggleGroup}
          toggleCat={toggleCat}
          handleSelectModel={handleSelectModel}
          setSidebarOpen={setSidebarOpen}
        />
      ),
      onModelChange: (newModel) => handleSelectModel(newModel.id),
      initialDropdownOpen: modelDropdownOpen,
      onNewChatWithPicker: () => {
        setModelDropdownOpen(true);
      },
    };
    switch (selectedModel.panelType) {
      case "chat":
        return <ChatPanel {...props} />;
      case "image":
        return <ImagePanel {...props} />;
      case "audio":
        return <AudioPanel {...props} />;
      case "threed":
        return <MeshyStudio {...props} />;
      case "trellis":
        return <TrellisPanel {...props} />;
      case "tripo":
        return <TripoPanel {...props} />;
      default:
        return <ChatPanel {...props} />;
    }
  };

  const is3D = ["threed", "trellis", "tripo"].includes(selectedModel?.panelType);

  return (
    <div className="flex w-full h-full bg-[#0a0a0f] overflow-hidden relative z-10 flex-1">
      <BackgroundFilters />

      {/* Sidebar - Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-[100] bg-black/50 lg:hidden backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[110] w-80 lg:hidden"
            >
              <AiStudioSidebar
                isMobile
                selectedAI={selectedAI}
                openGroups={openGroups}
                openCats={openCats}
                toggleGroup={toggleGroup}
                toggleCat={toggleCat}
                handleSelectModel={handleSelectModel}
                setSidebarOpen={setSidebarOpen}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col relative h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedModel.panelType}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col h-full w-full"
          >
            {renderPanel()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
