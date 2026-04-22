import React, { useState, useCallback, useContext, useEffect, useRef } from "react";
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
import toast from "react-hot-toast";
import { API_BASE } from "../api/client";

const PANEL_TYPE_TO_TAB = {
  tripo: '3d',
  threed: '3d',
  trellis: '3d',
  meshy: '3d',
  image: 'image',
  audio: 'audio',
  music: 'music',
};

export default function AIChat({ user, getIdToken }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const getTabForModel = useCallback((model) => {
    if (!model) return "chat";
    if (model.panelType === "image") return "image";
    if (model.panelType === "audio") return "audio";
    if (["threed", "trellis", "tripo", "meshy"].includes(model.panelType)) return "3d";
    return "chat";
  }, []);

  const getFirstModelForTab = useCallback((tab) => {
    return ALL_MODELS.find(m => {
      if (tab === "image") return m.panelType === "image";
      if (tab === "audio") return m.panelType === "audio";
      if (tab === "3d") return ["threed", "trellis", "tripo", "meshy"].includes(m.panelType);
      return m.panelType === "chat";
    }) || ALL_MODELS[0];
  }, []);

  const resolveTargetModel = useCallback((tab, modelParam) => {
    if (modelParam && getModel(modelParam)) return modelParam;
    const remembered = sessionStorage.getItem(`ludusgen_last_model:${tab}`);
    if (remembered && getModel(remembered)) return remembered;
    return getFirstModelForTab(tab).id;
  }, [getFirstModelForTab]);

  const [selectedAI, setSelectedAI] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") || "chat";
    return resolveTargetModel(tab, params.get("model"));
  });

  const [openGroups, setOpenGroups] = useState(() => {
    const gId = findModelGroup(selectedAI);
    return new Set(gId ? [gId] : ["chat"]);
  });

  const [openCats, setOpenCats] = useState(() => {
    const cId = findModelCat(selectedAI);
    return new Set(cId ? [cId] : ["chat_anthropic"]);
  });

  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [forceViewGenSignal, setForceViewGenSignal] = useState(0);

  // Desktop Sidebar Persistence & Motion
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('desktop_sidebar_open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [imageGalleryActive, setImageGalleryActive] = useState(false);

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

  const { navHeight } = useContext(MyUserContext);

  // 1. URL -> State Sync (Navigation driven)
  useEffect(() => {
    const tab = searchParams.get("tab") || "chat";
    const modelParam = searchParams.get("model");
    const targetModelId = resolveTargetModel(tab, modelParam);

    if (targetModelId !== selectedAI) {
      setSelectedAI(targetModelId);
      const gId = findModelGroup(targetModelId);
      const cId = findModelCat(targetModelId);
      if (gId) setOpenGroups(prev => new Set([...prev, gId]));
      if (cId) setOpenCats(prev => new Set([...prev, cId]));
    }
  }, [searchParams, resolveTargetModel, selectedAI]);

  const selectedModel = getModel(selectedAI) || ALL_MODELS[0];

  // 2. State -> SessionStorage Persistence
  useEffect(() => {
    if (selectedAI && selectedModel) {
      const tab = getTabForModel(selectedModel);
      sessionStorage.setItem(`ludusgen_last_model:${tab}`, selectedAI);

      // Granular image sub-mode persistence
      if (tab === "image") {
        const subKey = selectedModel.needsInputImage ? "image_edit" : "image_gen";
        sessionStorage.setItem(`ludusgen_last_model:${subKey}`, selectedAI);
      }
    }
  }, [selectedAI, selectedModel]);

  const handleSelectModel = useCallback((modelId) => {
    const oldModel = getModel(selectedAI);
    const newModel = getModel(modelId);
    const tab = getTabForModel(newModel);

    // Update session storage immediately to avoid race conditions
    sessionStorage.setItem(`ludusgen_last_model:${tab}`, modelId);
    if (tab === "image" && newModel) {
      const subKey = newModel.needsInputImage ? "image_edit" : "image_gen";
      sessionStorage.setItem(`ludusgen_last_model:${subKey}`, modelId);
    }

    // If both are chat panel types, keep the same conversation session
    if (oldModel?.panelType === 'chat' && newModel?.panelType === 'chat') {
      const sessionId = sessionStorage.getItem("chat_session_current");
      // Only call switch-model if the model actually changed
      if (sessionId && oldModel.id !== newModel.id) {
        getIdToken().then(async (token) => {
          try {
            await fetch(`${API_BASE}/api/chat/switch-model`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ sessionId, newModelId: modelId })
            });
          } catch (e) {
            console.warn('[ModelSwitch] Failed:', e);
          }
        });
      }
    }

    // Update state
    setSelectedAI(modelId);

    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      next.delete("model");
      return next;
    }, { replace: true });

    setForceViewGenSignal(s => s + 1);

    const gId = findModelGroup(modelId);
    const cId = findModelCat(modelId);
    if (gId) setOpenGroups((p) => new Set([...p, gId]));
    if (cId) setOpenCats((p) => new Set([...p, cId]));
    setSidebarOpen(false);
    setModelDropdownOpen(false);
  }, [getIdToken, setSearchParams, selectedAI]);

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
          onOpenJob={(job) => {
            const targetTab = job?.targetTab || PANEL_TYPE_TO_TAB[job?.panelType];
            if (targetTab) {
              const next = new URLSearchParams(searchParams);
              const targetModelId = job?.modelId
                || ALL_MODELS.find(m => m.panelType === job?.panelType)?.id
                || resolveTargetModel(targetTab, null);
              next.set('tab', targetTab);
              if (targetModelId) next.set('model', targetModelId);
              else next.delete('model');
              if (job?.panelType === 'tripo' && job.taskId) {
                next.set('tripoTaskId', job.taskId);
              }
              if (targetModelId) {
                sessionStorage.setItem(`ludusgen_last_model:${targetTab}`, targetModelId);
              }
              setSearchParams(next);
              sessionStorage.setItem(`ludusgen_open_job:${user?.uid || 'guest'}`, job.id);
            }
          }}
          isImageGallery={imageGalleryActive}
        />
      ),
      onModelChange: (newModel) => handleSelectModel(newModel.id),
      onGalleryChange: (active) => setImageGalleryActive(active),
      forceViewGenSignal,
      initialDropdownOpen: modelDropdownOpen,
      onNewChatWithPicker: () => {
        // model picker is intentionally disabled
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
