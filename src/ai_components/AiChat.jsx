import React, { useState, useCallback, useContext, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ALL_MODELS, getModel, findModelGroup, findModelCat } from "./models";
import ChatPanel from "./ChatPanel";
import ImagePanel from "./ImagePanel";
import AudioPanel from "./AudioPanel";
import Trellis2Panel from "./meshy/Meshy";
import TrellisPanel from "./trellis/TrellisPanel";
import TripoPanel from "./tripo/TripoPanel";
import { MyUserContext } from "../context/MyUserProvider";
import AiStudioSidebar from "../components/chat/AiStudioSidebar";
import BackgroundFilters from "../components/chat/BackgroundFilters";
import UserProfileDropdown from "../components/layout/UserProfileDropdown";

export default function AIChat({ user, getIdToken }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAI, setSelectedAI] = useState("claude_sonnet");
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    setSelectedAI(modelId);

    // Sync URL tab parameter
    const model = getModel(modelId);
    if (model) {
      let tab = "chat";
      if (model.panelType === "image") tab = "image";
      else if (model.panelType === "audio") tab = "audio";
      else if (["threed", "trellis", "tripo"].includes(model.panelType)) tab = "3d";

      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        next.set("model", modelId);
        return next;
      }, { replace: true });
    }

    const gId = findModelGroup(modelId);
    const cId = findModelCat(modelId);
    if (gId) setOpenGroups((p) => new Set([...p, gId]));
    if (cId) setOpenCats((p) => new Set([...p, cId]));
    setSidebarOpen(false);
  }, [setSearchParams]);

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
      setSidebarOpen
    };
    switch (selectedModel.panelType) {
      case "chat":
        return <ChatPanel {...props} />;
      case "image":
        return <ImagePanel {...props} />;
      case "audio":
        return <AudioPanel {...props} />;
      case "threed":
        return <Trellis2Panel {...props} />;
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
    <div className="flex w-full h-full bg-[#0a0a0f] transition-all duration-300 overflow-hidden relative z-10 flex-1">
      <BackgroundFilters />
      


      {/* Sidebar - Desktop */}
      <aside className="hidden lg:block w-80 xl:w-96 h-full flex-shrink-0">
        <AiStudioSidebar
          selectedAI={selectedAI}
          openGroups={openGroups}
          openCats={openCats}
          toggleGroup={toggleGroup}
          toggleCat={toggleCat}
          handleSelectModel={handleSelectModel}
          setSidebarOpen={setSidebarOpen}
        />
      </aside>

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
            key={selectedAI}
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
