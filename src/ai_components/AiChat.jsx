import React, { useState, useCallback, useContext, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useSpring } from "framer-motion";
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

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function AIChat({ user, getIdToken }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAI, setSelectedAI] = useState("claude_sonnet");
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
      setSidebarOpen,
      isGlobalOpen: desktopSidebarOpen // MASTER SYNC
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
      <div className="hidden lg:block h-full flex-shrink-0 relative z-20">
        <motion.aside 
          style={{ width: smoothWidth }}
          className="h-full overflow-hidden"
        >
          <div className="w-[320px] h-full overflow-hidden">
            <AiStudioSidebar
              selectedAI={selectedAI}
              openGroups={openGroups}
              openCats={openCats}
              toggleGroup={toggleGroup}
              toggleCat={toggleCat}
              handleSelectModel={handleSelectModel}
              setSidebarOpen={setSidebarOpen}
            />
          </div>
        </motion.aside>

        {/* Floating Toggle Button */}
        <motion.button
          initial={false}
          style={{ x: smoothWidth }}
          className="absolute left-[-1px] top-[8%] -translate-y-1/2 z-[110] flex items-center justify-center w-7 h-14 rounded-r-xl bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/10 border-l-0 hover:bg-white/10 transition-colors duration-200 text-zinc-500 hover:text-white shadow-2xl"
          onClick={toggleDesktopSidebar}
        >
          <motion.div
            animate={{ rotate: desktopSidebarOpen ? 0 : 180 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <PanelLeftClose className="w-4 h-4" />
          </motion.div>
        </motion.button>
      </div>

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
