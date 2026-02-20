import React, { useState, useEffect, useCallback } from "react";
import {
  Wand2, Box, Star, CircleDot, ChevronRight, ChevronDown,
  MessageSquare, Image, Music, Code, Cpu, Menu, X,
} from "lucide-react";
import { MODEL_GROUPS, ALL_MODELS, getModel, findModelGroup, findModelCat } from "./models";
import ChatPanel from "./ChatPanel";
import ImagePanel from "./ImagePanel";
import AudioPanel from "./AudioPanel";
import Trellis2Panel from "./Trellis2panel";

// ─── Group icon map ────────────────────────────────────
const GroupIcon = ({ group, className = "w-4 h-4" }) => {
  const icons = {
    chat: <MessageSquare className={className} />,
    code: <Code className={className} />,
    image: <Image className={className} />,
    audio: <Music className={className} />,
    threed: <Box className={className} />,
  };
  return icons[group.id] || <Cpu className={className} />;
};

// ─── Tier badge ────────────────────────────────────────
const TierBadge = ({ tier, tierLabel }) => (
  <span
    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
    style={
      tier === "pro"
        ? { background: "linear-gradient(90deg,#7c3aed,#db2777)", color: "#fff" }
        : { background: "rgba(255,255,255,0.09)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.12)" }
    }
  >
    {tier === "pro" ? "⭐" : "⚡"} {tierLabel}
  </span>
);

// ─── Single model button ────────────────────────────────
const ModelBtn = ({ model, isActive, onSelect }) => (
  <button
    onClick={() => onSelect(model.id)}
    className="cursor-pointer w-full p-2.5 rounded-xl transition-all duration-150 text-left group"
    style={{
      background: isActive ? `${model.color}18` : "rgba(255,255,255,0.02)",
      border: isActive ? `1.5px solid ${model.color}50` : "1.5px solid rgba(255,255,255,0.05)",
      transform: isActive ? "scale(1.01)" : "scale(1)",
    }}
    onMouseEnter={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = `${model.color}10`;
        e.currentTarget.style.border = `1.5px solid ${model.color}30`;
        e.currentTarget.style.transform = "scale(1.005)";
      }
    }}
    onMouseLeave={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
        e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.05)";
        e.currentTarget.style.transform = "scale(1)";
      }
    }}
  >
    <div className="flex items-start gap-2">
      <div
        className="w-0.5 rounded-full self-stretch flex-shrink-0 transition-all duration-150"
        style={{
          background: model.tier === "pro"
            ? "linear-gradient(180deg,#7c3aed,#db2777)"
            : "rgba(255,255,255,0.18)",
          minHeight: "36px",
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="text-white font-semibold text-xs truncate">{model.name}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isActive && <CircleDot className="w-2.5 h-2.5 text-green-400 animate-pulse" />}
            <TierBadge tier={model.tier} tierLabel={model.tierLabel} />
          </div>
        </div>
        <p className="text-gray-500 text-xs leading-snug truncate">{model.description}</p>
        <span
          className="inline-block mt-1 text-xs font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: `${model.color}18`, color: model.color, border: `1px solid ${model.color}35` }}
        >
          {model.badge}
        </span>
      </div>
    </div>
  </button>
);

// ─── Main component ────────────────────────────────────
export default function AIChat({ user, getIdToken }) {
  const [selectedAI, setSelectedAI] = useState("claude_sonnet");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => new Set(["chat"]));
  const [openCats, setOpenCats] = useState(() => new Set(["chat_anthropic"]));

  const selectedModel = getModel(selectedAI) || ALL_MODELS[0];

  const handleSelectModel = useCallback((modelId) => {
    setSelectedAI(modelId);
    const gId = findModelGroup(modelId);
    const cId = findModelCat(modelId);
    if (gId) setOpenGroups((p) => new Set([...p, gId]));
    if (cId) setOpenCats((p) => new Set([...p, cId]));
    setSidebarOpen(false);
  }, []);

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
    };
    switch (selectedModel.panelType) {
      case "chat":   return <ChatPanel  {...props} />;
      case "image":  return <ImagePanel {...props} />;
      case "audio":  return <AudioPanel {...props} />;
      case "threed": return <Trellis2Panel {...props} />;
      default:       return <ChatPanel {...props} />;
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-purple-400" />
            AI Modellek
          </h2>
          <button
            className="cursor-pointer md:hidden p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-gray-600 text-xs mt-0.5">Válassz egyet az indításhoz</p>
      </div>

      {/* Scrollable model list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 scrollbar-thin">
        {MODEL_GROUPS.map((group) => {
          const groupOpen = openGroups.has(group.id);
          const hasActiveInGroup = group.categories.flatMap((c) => c.models).some((m) => m.id === selectedAI);

          return (
            <div key={group.id}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="cursor-pointer w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all duration-150 mt-1"
                style={{
                  background: groupOpen
                    ? `${group.color}12`
                    : hasActiveInGroup
                      ? `${group.color}0a`
                      : "rgba(255,255,255,0.02)",
                  border: groupOpen
                    ? `1px solid ${group.color}30`
                    : hasActiveInGroup
                      ? `1px solid ${group.color}20`
                      : "1px solid rgba(255,255,255,0.05)",
                }}
                onMouseEnter={(e) => {
                  if (!groupOpen && !hasActiveInGroup) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!groupOpen && !hasActiveInGroup) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.05)";
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                    style={{ background: `${group.color}20`, color: group.color }}
                  >
                    {group.emoji}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: (groupOpen || hasActiveInGroup) ? "white" : "#9ca3af" }}
                  >
                    {group.label}
                  </span>
                  {hasActiveInGroup && (
                    <CircleDot className="w-2 h-2 animate-pulse" style={{ color: group.color }} />
                  )}
                </span>
                {groupOpen
                  ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                }
              </button>

              {/* Group body */}
              {groupOpen && (
                <div className="pl-2 mt-1 space-y-1">
                  {group.categories.map((cat) => {
                    const catOpen = openCats.has(cat.id);
                    const hasActiveInCat = cat.models.some((m) => m.id === selectedAI);

                    return (
                      <div key={cat.id}>
                        {cat.label && (
                          <button
                            onClick={() => toggleCat(cat.id)}
                            className="cursor-pointer w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-all duration-150 hover:bg-white/5"
                            style={{
                              background: hasActiveInCat ? `${group.color}10` : "transparent",
                            }}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="text-gray-500 text-xs">{cat.label}</span>
                              {hasActiveInCat && (
                                <CircleDot className="w-2 h-2 animate-pulse" style={{ color: group.color }} />
                              )}
                            </span>
                            {catOpen
                              ? <ChevronDown className="w-3 h-3 text-gray-600" />
                              : <ChevronRight className="w-3 h-3 text-gray-600" />
                            }
                          </button>
                        )}

                        {(catOpen || !cat.label) && (
                          <div className="space-y-1 mt-0.5">
                            {cat.models.length === 2 && (
                              <div className="flex gap-2 px-2 pt-0.5 pb-0.5">
                                <span className="text-xs text-gray-700 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600" /> Gyors
                                </span>
                                <span className="text-gray-700 text-xs">·</span>
                                <span className="text-xs text-purple-500 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600" /> Prémium
                                </span>
                              </div>
                            )}
                            {cat.models.map((model) => (
                              <ModelBtn
                                key={model.id}
                                model={model}
                                isActive={selectedAI === model.id}
                                onSelect={handleSelectModel}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Active model info card */}
        <div
          className="mt-3 p-3 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="flex items-center gap-1.5 text-purple-400 mb-2">
            <Star className="w-3 h-3" />
            <span className="text-xs font-semibold">Aktív modell</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-gray-600">Modell:</span>
              <span className="text-white font-semibold text-right truncate">{selectedModel.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Típus:</span>
              <span className="font-semibold" style={{ color: selectedModel.color }}>
                {selectedModel.panelType === "chat" ? "💬 Chat"
                  : selectedModel.panelType === "image" ? "🖼️ Kép"
                  : selectedModel.panelType === "audio" ? "🎵 Hang"
                  : selectedModel.panelType === "threed" ? `🧊 ${selectedModel.inputType === "image" ? "Kép" : "Szöveg"} → 3D`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ár:</span>
              <span className="text-white font-semibold">{selectedModel.badge}</span>
            </div>
            {selectedModel.badgeDetail && (
              <div className="mt-0.5">
                <span className="text-gray-700 text-xs">{selectedModel.badgeDetail}</span>
              </div>
            )}
            {selectedModel.provider && (
              <div className="flex justify-between">
                <span className="text-gray-600">Provider:</span>
                <span className="text-gray-400 font-medium">{selectedModel.provider}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-2 md:p-4 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at top, #1a0b2e 0%, #0a0118 50%, #000000 100%)",
        fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif",
      }}
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-float-slow" />
        <div
          className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full blur-3xl transition-all duration-1000"
          style={{ background: `${selectedModel.color}10` }}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden cursor-pointer"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ════════ LAYOUT ════════ */}
      <div className="relative w-full h-[95vh] md:h-[90vh] flex gap-3 z-10">

        {/* ── Sidebar ── */}
        <aside
          className={`
            fixed md:relative top-0 left-0 h-full z-50 md:z-auto
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            w-64 md:w-64 lg:w-72 flex-shrink-0
          `}
          style={{
            height: "100%",
            borderRadius: "1.5rem",
            backdropFilter: "blur(24px)",
            background: "rgba(12,12,30,0.75)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          <SidebarContent />
        </aside>

        {/* ── Main content area ── */}
        <main
          className="flex-1 min-w-0 flex flex-col rounded-3xl overflow-hidden transition-all duration-500"
          style={{
            background: "rgba(12,12,30,0.7)",
            backdropFilter: "blur(24px)",
            border: `1px solid ${selectedModel.color}25`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 40px ${selectedModel.color}08, inset 0 1px 0 rgba(255,255,255,0.07)`,
          }}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/5 flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.015)" }}
          >
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                className="cursor-pointer md:hidden p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                style={{ background: "rgba(255,255,255,0.05)" }}
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Model icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${selectedModel.color}60, ${selectedModel.color}30)`,
                  border: `1px solid ${selectedModel.color}40`,
                  color: "white",
                }}
              >
                {selectedModel.panelType === "chat" ? "💬"
                  : selectedModel.panelType === "image" ? "🖼️"
                  : selectedModel.panelType === "audio" ? "🎵"
                  : selectedModel.panelType === "threed" ? "🧊"
                  : "✦"}
              </div>

              <div>
                <h3 className="font-bold text-white text-sm leading-tight">{selectedModel.name}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <CircleDot className="w-1.5 h-1.5 text-green-400 animate-pulse" />
                  {selectedModel.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <TierBadge tier={selectedModel.tier} tierLabel={selectedModel.tierLabel} />
              <span
                className="hidden sm:block text-xs font-medium px-2.5 py-1 rounded-full"
                style={{
                  background: `${selectedModel.color}15`,
                  color: selectedModel.color,
                  border: `1px solid ${selectedModel.color}30`,
                }}
              >
                {selectedModel.badge}
              </span>
            </div>
          </div>

          {/* Panel — overflow-hidden keeps scrolling inside panel, not on page */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {renderPanel()}
          </div>
        </main>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(25px,-25px) scale(1.08); }
          66% { transform:translate(-18px,18px) scale(0.92); }
        }
        @keyframes float-delayed {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(-25px,25px) scale(0.92); }
          66% { transform:translate(18px,-18px) scale(1.08); }
        }
        @keyframes float-slow {
          0%,100% { transform:translate(0,0) scale(1); }
          50% { transform:translate(0,25px) scale(1.04); }
        }
        .animate-float { animation: float 22s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 28s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 32s ease-in-out infinite; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }
      `}</style>
    </div>
  );
}