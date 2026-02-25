import React, { useState, useCallback } from "react";
import {
  Wand2, Box, Star, CircleDot, ChevronRight, ChevronDown,
  MessageSquare, Image, Music, Code, Cpu, Menu, X, Zap,
} from "lucide-react";
import {
  MODEL_GROUPS, ALL_MODELS, getModel, findModelGroup, findModelCat,
} from "./models";
import ChatPanel from "./ChatPanel";
import ImagePanel from "./ImagePanel";
import AudioPanel from "./AudioPanel";
import { MyUserContext } from "../context/MyUserProvider";
import { useContext } from "react";
import Trellis2Panel from "./meshy/Meshy";
import TrellisPanel from "./trellis/TrellisPanel";

// ─── Design Tokens ─────────────────────────────────────────────────────────
const T = {
  bg: {
    base:    "#05050e",
    surface: "rgba(255,255,255,0.025)",
    hover:   "rgba(255,255,255,0.05)",
    deep:    "rgba(0,0,0,0.3)",
  },
  border: {
    subtle:  "rgba(255,255,255,0.06)",
    default: "rgba(255,255,255,0.09)",
    strong:  "rgba(255,255,255,0.14)",
  },
  text: {
    primary:   "#eeeef8",
    secondary: "#7878a0",
    muted:     "#3a3a5c",
    dim:       "#1e1e38",
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 24 },
};

// ─── Shared micro-components ───────────────────────────────────────────────
const Label = ({ children, color }) => (
  <span style={{
    fontSize: 9, fontWeight: 800, letterSpacing: "0.09em",
    textTransform: "uppercase",
    color: color || T.text.muted,
  }}>
    {children}
  </span>
);

const Pill = ({ children, color, glow }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 3,
    padding: "2px 7px", borderRadius: 99,
    fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
    background: `${color}18`,
    color: color,
    border: `1px solid ${color}30`,
    boxShadow: glow ? `0 0 8px ${color}30` : "none",
    whiteSpace: "nowrap",
  }}>
    {children}
  </span>
);

// ─── Group icon ─────────────────────────────────────────────────────────────
const panelEmoji = {
  chat: "💬", image: "🖼️", audio: "🎵", threed: "🧊", trellis: "✦",
};

const TierBadge = ({ tier, tierLabel }) => {
  const isPro = tier === "pro";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 6px", borderRadius: 99, fontSize: 9, fontWeight: 800,
      flexShrink: 0,
      background: isPro
        ? "linear-gradient(90deg,#7c3aed,#db2777)"
        : T.border.default,
      color: isPro ? "#fff" : T.text.secondary,
      border: isPro ? "none" : `1px solid ${T.border.strong}`,
    }}>
      {isPro ? "⭐" : "⚡"} {tierLabel}
    </span>
  );
};

// ─── Model card ─────────────────────────────────────────────────────────────
const ModelCard = ({ model, isActive, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const on = isActive || hovered;
  return (
    <button
      onClick={() => onSelect(model.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", padding: "9px 10px",
        borderRadius: T.radius.md,
        border: `1px solid ${on ? model.color + "45" : T.border.subtle}`,
        background: isActive
          ? `${model.color}14`
          : hovered
            ? `${model.color}08`
            : T.bg.surface,
        cursor: "pointer", textAlign: "left",
        transition: "all 0.15s cubic-bezier(0.4,0,0.2,1)",
        transform: isActive ? "scale(1.01)" : "scale(1)",
        boxShadow: isActive ? `0 2px 16px ${model.color}20` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        {/* Active indicator stripe */}
        <div style={{
          width: 2, borderRadius: 2, alignSelf: "stretch", flexShrink: 0,
          minHeight: 34,
          background: isActive
            ? model.tier === "pro"
              ? `linear-gradient(180deg, #7c3aed, #db2777)`
              : model.color
            : T.border.subtle,
          transition: "background 0.15s",
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top row */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 6, marginBottom: 3,
          }}>
            <span style={{
              color: isActive ? "#fff" : T.text.primary,
              fontSize: 11, fontWeight: 700,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {model.name}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              {isActive && (
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#4ade80",
                  boxShadow: "0 0 6px #4ade8088",
                  animation: "pulse 2s infinite",
                }} />
              )}
              <TierBadge tier={model.tier} tierLabel={model.tierLabel} />
            </div>
          </div>

          {/* Description */}
          <p style={{
            color: T.text.secondary, fontSize: 10, margin: "0 0 5px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.4,
          }}>
            {model.description}
          </p>

          {/* Badge */}
          <span style={{
            display: "inline-block",
            padding: "1px 6px", borderRadius: 6,
            fontSize: 9, fontWeight: 700,
            background: `${model.color}15`,
            color: model.color,
            border: `1px solid ${model.color}30`,
          }}>
            {model.badge}
          </span>
        </div>
      </div>
    </button>
  );
};

// ─── Sidebar component ───────────────────────────────────────────────────────
const Sidebar = ({ selectedAI, onSelect, openGroups, openCats, toggleGroup, toggleCat, onClose }) => (
  <div style={{
    display: "flex", flexDirection: "column", height: "100%",
    fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif",
  }}>
    {/* Header */}
    <div style={{
      padding: "16px 14px 12px",
      borderBottom: `1px solid ${T.border.subtle}`,
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 10,
            background: "linear-gradient(135deg, #7c3aed30, #db277720)",
            border: "1px solid rgba(124,58,237,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Wand2 style={{ width: 14, height: 14, color: "#a78bfa" }} />
          </div>
          <div>
            <p style={{ color: T.text.primary, fontSize: 13, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
              AI Modellek
            </p>
            <p style={{ color: T.text.muted, fontSize: 9, margin: 0, letterSpacing: "0.04em" }}>
              Válassz egyet az indításhoz
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: 5, borderRadius: 8, border: "none", cursor: "pointer",
              background: T.bg.hover, color: T.text.secondary,
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>
    </div>

    {/* Model list */}
    <div style={{
      flex: 1, overflowY: "auto", padding: "10px 10px 6px",
      scrollbarWidth: "thin",
      scrollbarColor: "rgba(255,255,255,0.06) transparent",
    }}>
      {MODEL_GROUPS.map((group) => {
        const groupOpen = openGroups.has(group.id);
        const hasActive = group.categories.flatMap(c => c.models).some(m => m.id === selectedAI);

        return (
          <div key={group.id} style={{ marginBottom: 4 }}>
            {/* Group toggle */}
            <button
              onClick={() => toggleGroup(group.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px", borderRadius: T.radius.md,
                border: `1px solid ${groupOpen || hasActive ? group.color + "28" : T.border.subtle}`,
                background: groupOpen
                  ? `${group.color}10`
                  : hasActive
                    ? `${group.color}08`
                    : T.bg.surface,
                cursor: "pointer", marginBottom: groupOpen ? 6 : 0,
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 8, fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${group.color}20`,
                }}>
                  {group.emoji}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: groupOpen || hasActive ? "#fff" : T.text.secondary,
                }}>
                  {group.label}
                </span>
                {hasActive && (
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: group.color,
                    boxShadow: `0 0 5px ${group.color}`,
                  }} />
                )}
              </div>
              <div style={{
                color: T.text.muted, transition: "transform 0.2s",
                transform: groupOpen ? "rotate(0deg)" : "rotate(-90deg)",
              }}>
                <ChevronDown style={{ width: 12, height: 12 }} />
              </div>
            </button>

            {/* Group body */}
            {groupOpen && (
              <div style={{ paddingLeft: 6, display: "flex", flexDirection: "column", gap: 3 }}>
                {group.categories.map((cat) => {
                  const catOpen = openCats.has(cat.id);
                  const hasActiveCat = cat.models.some(m => m.id === selectedAI);

                  return (
                    <div key={cat.id}>
                      {cat.label && (
                        <button
                          onClick={() => toggleCat(cat.id)}
                          style={{
                            width: "100%", display: "flex", alignItems: "center",
                            justifyContent: "space-between",
                            padding: "5px 8px", borderRadius: 8,
                            background: hasActiveCat ? `${group.color}0a` : "transparent",
                            border: "none", cursor: "pointer",
                            marginBottom: 3,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Label>{cat.label}</Label>
                            {hasActiveCat && (
                              <div style={{
                                width: 4, height: 4, borderRadius: "50%",
                                background: group.color,
                              }} />
                            )}
                          </div>
                          <ChevronRight style={{
                            width: 10, height: 10, color: T.text.muted,
                            transition: "transform 0.15s",
                            transform: catOpen ? "rotate(90deg)" : "rotate(0deg)",
                          }} />
                        </button>
                      )}

                      {(catOpen || !cat.label) && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {cat.models.length === 2 && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "2px 8px",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.text.muted }} />
                                <Label>Gyors</Label>
                              </div>
                              <div style={{ width: 1, height: 10, background: T.border.subtle }} />
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#7c3aed" }} />
                                <Label color="#7c3aed">Prémium</Label>
                              </div>
                            </div>
                          )}
                          {cat.models.map((model) => (
                            <ModelCard
                              key={model.id}
                              model={model}
                              isActive={selectedAI === model.id}
                              onSelect={onSelect}
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
    </div>

    {/* Active model card */}
    <div style={{
      padding: "8px 10px 12px",
      borderTop: `1px solid ${T.border.subtle}`,
      flexShrink: 0,
    }}>
      <ActiveModelCard selectedAI={selectedAI} />
    </div>
  </div>
);

// ─── Active model summary card ───────────────────────────────────────────────
const ActiveModelCard = ({ selectedAI }) => {
  const model = getModel(selectedAI) || ALL_MODELS[0];
  return (
    <div style={{
      borderRadius: T.radius.md, overflow: "hidden",
      border: `1px solid ${model.color}25`,
      background: `${model.color}08`,
    }}>
      {/* Card header */}
      <div style={{
        padding: "8px 10px",
        borderBottom: `1px solid ${model.color}18`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 7,
          background: `${model.color}20`, border: `1px solid ${model.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11,
        }}>
          {panelEmoji[model.panelType] || "✦"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            color: "#fff", fontSize: 10, fontWeight: 700, margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {model.name}
          </p>
        </div>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "#4ade80",
          boxShadow: "0 0 6px #4ade8080",
        }} />
      </div>

      {/* Meta rows */}
      <div style={{ padding: "7px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        {[
          { k: "Típus", v: model.panelType === "chat" ? "💬 Chat" : model.panelType === "image" ? "🖼️ Kép" : model.panelType === "audio" ? "🎵 Hang" : "🧊 3D", c: model.color },
          { k: "Ár", v: model.badge, c: "#e5e7eb" },
          model.provider && { k: "Provider", v: model.provider, c: T.text.secondary },
        ].filter(Boolean).map(({ k, v, c }) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Label>{k}</Label>
            <span style={{ color: c, fontSize: 10, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Top bar ─────────────────────────────────────────────────────────────────
const TopBar = ({ model, onOpenSidebar }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 16px", height: 52, flexShrink: 0,
    borderBottom: `1px solid ${T.border.subtle}`,
    background: "rgba(5,5,14,0.5)",
  }}>
    {/* Left */}
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {/* Mobile hamburger */}
      <button
        className="md:hidden"
        onClick={onOpenSidebar}
        style={{
          width: 32, height: 32, borderRadius: 9,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${T.border.default}`,
          background: T.bg.surface,
          cursor: "pointer", color: T.text.secondary,
        }}
      >
        <Menu style={{ width: 14, height: 14 }} />
      </button>

      {/* Model icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 11,
        background: `linear-gradient(135deg, ${model.color}50, ${model.color}28)`,
        border: `1px solid ${model.color}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, flexShrink: 0,
        boxShadow: `0 2px 12px ${model.color}30`,
      }}>
        {panelEmoji[model.panelType] || "✦"}
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 800, lineHeight: 1 }}>
            {model.name}
          </span>
          <TierBadge tier={model.tier} tierLabel={model.tierLabel} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "#4ade80", boxShadow: "0 0 5px #4ade8088",
          }} />
          <span style={{ color: T.text.secondary, fontSize: 10 }}>
            {model.description}
          </span>
        </div>
      </div>
    </div>

    {/* Right */}
    <Pill color={model.color} glow>
      {model.badge}
    </Pill>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
export default function AIChat({ user, getIdToken }) {
  const [selectedAI, setSelectedAI] = useState("claude_sonnet");
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [openGroups, setOpenGroups]     = useState(() => new Set(["chat"]));
  const [openCats, setOpenCats]         = useState(() => new Set(["chat_anthropic"]));
  const { navHeight } = useContext(MyUserContext);
  const selectedModel = getModel(selectedAI) || ALL_MODELS[0];

  const handleSelectModel = useCallback((id) => {
    setSelectedAI(id);
    setSidebarOpen(false);
  }, []);

  const toggleGroup = useCallback((id) => setOpenGroups(p => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  }), []);

  const toggleCat = useCallback((id) => setOpenCats(p => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  }), []);

  const renderPanel = () => {
    const props = { selectedModel, userId: user?.uid, getIdToken };
    switch (selectedModel.panelType) {
      case "chat":    return <ChatPanel {...props} />;
      case "image":   return <ImagePanel {...props} />;
      case "audio":   return <AudioPanel {...props} />;
      case "threed":  return <Trellis2Panel {...props} />;
      case "trellis": return <TrellisPanel {...props} />;
      default:        return <ChatPanel {...props} />;
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      padding: "8px", position: "relative", overflow: "hidden",
      background: "radial-gradient(ellipse at 30% 20%, #1a0b2e 0%, #0a0118 55%, #000 100%)",
      fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif",
    }}>
      {/* Background atmosphere */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "20%", left: "20%",
          width: 480, height: 480,
          background: "rgba(124,58,237,0.12)", borderRadius: "50%",
          filter: "blur(80px)", animation: "floatA 22s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "20%", right: "20%",
          width: 400, height: 400,
          background: "rgba(59,130,246,0.10)", borderRadius: "50%",
          filter: "blur(80px)", animation: "floatB 28s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", top: "40%", right: "30%",
          width: 320, height: 320,
          background: `${selectedModel.color}10`, borderRadius: "50%",
          filter: "blur(70px)", transition: "background 0.8s",
        }} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(0,0,0,0.65)",
          }}
        />
      )}

      {/* Layout */}
      <div style={{
        position: "relative", width: "100%", paddingTop: 40,
        display: "flex", gap: 10, zIndex: 10,
        height: `calc(100vh - ${navHeight}px)`,
      }}>

        {/* ── Sidebar ── */}
        <aside
          style={{
            // Mobile: fixed overlay. Desktop: relative.
            position: "relative",
            width: 260,
            flexShrink: 0,
            borderRadius: T.radius.xl,
            backdropFilter: "blur(28px)",
            background: "rgba(8,8,22,0.80)",
            border: `1px solid ${T.border.default}`,
            boxShadow: "0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}
          className="hidden md:flex md:flex-col"
        >
          <Sidebar
            selectedAI={selectedAI}
            onSelect={handleSelectModel}
            openGroups={openGroups}
            openCats={openCats}
            toggleGroup={toggleGroup}
            toggleCat={toggleCat}
          />
        </aside>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <aside style={{
            position: "fixed", top: 0, left: 0, height: "100%",
            width: 280, zIndex: 50,
            borderRadius: `0 ${T.radius.xl}px ${T.radius.xl}px 0`,
            backdropFilter: "blur(28px)",
            background: "rgba(8,8,22,0.95)",
            border: `1px solid ${T.border.default}`,
            boxShadow: "8px 0 40px rgba(0,0,0,0.7)",
          }}>
            <Sidebar
              selectedAI={selectedAI}
              onSelect={handleSelectModel}
              openGroups={openGroups}
              openCats={openCats}
              toggleGroup={toggleGroup}
              toggleCat={toggleCat}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        )}

        {/* ── Main panel ── */}
        <main style={{
          flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
          borderRadius: T.radius.xl, overflow: "hidden",
          backdropFilter: "blur(24px)",
          background: "rgba(8,8,22,0.75)",
          border: `1px solid ${selectedModel.color}22`,
          boxShadow: `0 8px 40px rgba(0,0,0,0.45), 0 0 60px ${selectedModel.color}08, inset 0 1px 0 rgba(255,255,255,0.06)`,
          transition: "border-color 0.4s, box-shadow 0.4s",
        }}>
          <TopBar model={selectedModel} onOpenSidebar={() => setSidebarOpen(true)} />
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            {renderPanel()}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes floatA {
          0%,100%{transform:translate(0,0) scale(1)}
          33%{transform:translate(24px,-24px) scale(1.08)}
          66%{transform:translate(-18px,18px) scale(0.93)}
        }
        @keyframes floatB {
          0%,100%{transform:translate(0,0) scale(1)}
          33%{transform:translate(-24px,24px) scale(0.93)}
          66%{transform:translate(18px,-18px) scale(1.08)}
        }
        @keyframes pulse {
          0%,100%{opacity:1} 50%{opacity:0.4}
        }
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.07);border-radius:2px}
      `}</style>
    </div>
  );
}