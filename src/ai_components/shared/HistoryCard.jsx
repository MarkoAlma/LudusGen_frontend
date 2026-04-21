// shared/HistoryCard.jsx  — DAW / Game Asset Browser aesthetic
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Download, RotateCcw, Trash2, Box, Sparkles, AlertCircle, PersonStanding, Wand2 } from "lucide-react";
import { getCachedThumbnail, checkThumbnailCache } from "../trellis/Glbthumbnail";
import { fetchModelData } from "../trellis/utils";

/* ─── CSS injection ──────────────────────────────────────────────────────── */
const CARD_STYLE_ID = "__hcard-styles__";
if (!document.getElementById(CARD_STYLE_ID)) {
  const s = document.createElement("style");
  s.id = CARD_STYLE_ID;
  s.textContent = `
    @keyframes hcard-shimmer {
      0%   { background-position: -400% 0; }
      100% { background-position: 400% 0; }
    }
    @keyframes hcard-pulse {
      0%, 100% { opacity: 0.4; }
      50%       { opacity: 1; }
    }
    @keyframes hcard-spin {
      to { transform: rotate(360deg); }
    }
    .hcard-actions { opacity: 0; transform: translateY(3px); transition: opacity 0.18s ease, transform 0.18s ease; }
    .hcard-root:hover .hcard-actions { opacity: 1; transform: translateY(0); }

    /* Dot-grid texture revealed on hover */
    .hcard-root::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
      background-size: 12px 12px;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 0;
    }
    .hcard-root:hover::before { opacity: 1; }
    .hcard-root.hcard-active::before { opacity: 0.6; }
  `;
  document.head.appendChild(s);
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function relativeTime(d) {
  try {
    if (!d) return "";
    const date = d?.toDate ? d.toDate() : new Date(d);
    if (isNaN(date.getTime())) return "";
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  } catch { return ""; }
}

function absTime(d) {
  try {
    if (!d) return "";
    const date = d?.toDate ? d.toDate() : new Date(d);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function promptFallbackName(p) {
  if (!p) return "Unnamed Model";
  const words = p.trim().split(/\s+/);
  return words.length > 4 ? words.slice(0, 4).join(" ") + "…" : words.join(" ");
}

function useContainerWidth(ref) {
  const [width, setWidth] = useState(200);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    setWidth(ref.current.offsetWidth);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

const EXPIRED_URLS = new Set();

/* ─── Type config ────────────────────────────────────────────────────────── */
const getTypeConfig = (isAnimated, isRigged) => {
  if (isAnimated) return { rail: "#22d3ee", glow: "#0891b2", label: "ANIM", Icon: Wand2 };
  if (isRigged) return { rail: "#f472b6", glow: "#db2777", label: "RIG", Icon: PersonStanding };
  return { rail: "#64748b", glow: "#475569", label: "MODEL", Icon: Box };
};

/* ─── ShimmerThumb — animated loading skeleton ───────────────────────────── */
function ShimmerThumb({ height }) {
  return (
    <div style={{
      width: "100%", height, borderRadius: "7px 7px 0 0",
      background: "linear-gradient(90deg, #12082a 25%, #261560 50%, #12082a 75%)",
      backgroundSize: "400% 100%",
      animation: "hcard-shimmer 1.6s ease-in-out infinite",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 10,
      }}>
        {/* Loading ring */}
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          border: "1.5px solid rgba(167,139,250,0.15)",
          borderTop: "1.5px solid rgba(167,139,250,0.7)",
          animation: "hcard-spin 0.9s linear infinite",
        }} />
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 7.5, color: "rgba(167,139,250,0.35)",
          letterSpacing: "0.1em", animation: "hcard-pulse 1.4s ease-in-out infinite",
        }}>RENDERING</span>
      </div>
    </div>
  );
}

/* ─── HistoryCard ────────────────────────────────────────────────────────── */
const HistoryCard = React.memo(function HistoryCard({
  item, isActive, onSelect, onReuse, onDownload, onDelete,
  color = "#64748b", getIdToken,
}) {
  const containerRef = React.useRef(null);
  const containerWidth = useContainerWidth(containerRef);
  const isNarrow = containerWidth < 160;
  const thumbH = isNarrow ? 110 : 155;

  const [thumbnail, setThumbnail] = useState(null);
  const [thumbLoading, setThumbLoading] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [errorCode, setErrorCode] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [timeTooltip, setTimeTooltip] = useState(false);

  useEffect(() => {
    if (!item?.model_url) return;
    if (item?.status === "failed" || EXPIRED_URLS.has(item.model_url)) {
      setThumbError(true);
      if (EXPIRED_URLS.has(item.model_url)) setErrorCode(410);
      return;
    }
    const cached = checkThumbnailCache(item.model_url);
    if (cached) {
      setThumbnail(cached);
      setThumbError(false);
      setThumbLoading(false);
      return;
    }
    let cancelled = false;
    setThumbError(false);
    let loadingTimer = null;
    (async () => {
      setErrorCode(null);
      try {
        const data = await fetchModelData(item.model_url, getIdToken, item.taskId);
        if (cancelled || !data) return;
        // Show shimmer only if not already resolved (prevents flicker for cache hits)
        if (!cancelled) { loadingTimer = setTimeout(() => { if (!cancelled) setThumbLoading(true); }, 150); }
        const thumb = await getCachedThumbnail(data.buffer, { width: 280, height: 280 }, item.model_url);
        if (data.blobUrl) URL.revokeObjectURL(data.blobUrl);
        clearTimeout(loadingTimer);
        if (!cancelled) { if (thumb) setThumbnail(thumb); else setThumbError(true); }
      } catch (err) {
        clearTimeout(loadingTimer);
        if (!cancelled) {
          const st = err.status || null; setErrorCode(st); setThumbError(true);
          if (st === 410) EXPIRED_URLS.add(item.model_url);
          else console.error("[HistoryCard]", err?.message);
        }
      } finally { if (!cancelled) setThumbLoading(false); }
    })();
    return () => { cancelled = true; clearTimeout(loadingTimer); };
  }, [item?.model_url, getIdToken]);

  const handleSelect = useCallback(() => onSelect?.(item), [onSelect, item]);
  const handleReuse = useCallback((e) => { e.stopPropagation(); onReuse?.(item); }, [onReuse, item]);
  const handleDownload = useCallback((e) => { e.stopPropagation(); onDownload?.(item); }, [onDownload, item]);
  const handleDelete = useCallback((e) => { e.stopPropagation(); onDelete?.(item); }, [onDelete, item]);

  const isAnimated = !!item?.params?.animated;
  const isRigged = !!item?.params?.rigged;
  const typeConfig = getTypeConfig(isAnimated, isRigged);
  const rail = typeConfig.rail;
  const glow = typeConfig.glow;
  const hasAiName = !!item?.name;
  const prompt = item?.prompt ?? "";
  const displayName = useMemo(() => item?.name || promptFallbackName(prompt), [item?.name, prompt]);
  const timeRel = relativeTime(item?.createdAt ?? item?.ts);
  const timeAbs = absTime(item?.createdAt ?? item?.ts);

  return (
    <div
      ref={containerRef}
      onClick={handleSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`hcard-root${isActive ? " hcard-active" : ""}`}
      style={{
        flexShrink: 0, borderRadius: 8, cursor: "pointer",
        position: "relative", overflow: "hidden",
        transition: "box-shadow 0.25s ease, transform 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        /* Colored left-rail border by type */
        border: `1px solid ${isActive ? rail + "60" : hovered ? rail + "28" : "rgba(255,255,255,0.07)"}`,
        background: isActive
          ? `linear-gradient(135deg, ${rail}0f 0%, rgba(0,0,0,0.6) 100%)`
          : "rgba(8,5,20,0.9)",
        boxShadow: isActive
          ? `0 0 40px ${glow}30, 0 0 80px ${glow}10, 0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 ${rail}25`
          : hovered
            ? `0 8px 24px rgba(0,0,0,0.4), 0 0 20px ${glow}15, inset 0 1px 0 ${rail}12`
            : "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      {/* Left type accent rail */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 2, zIndex: 3,
        background: `linear-gradient(180deg, ${rail}, ${rail}60)`,
        boxShadow: isActive || hovered ? `0 0 8px ${glow}80` : "none",
        transition: "box-shadow 0.25s",
      }} />

      {/* ── Thumbnail ─────────────────────────────────────────────────────── */}
      {thumbLoading ? (
        <ShimmerThumb height={thumbH} />
      ) : (
        <div style={{
          width: "100%", height: thumbH, minHeight: thumbH, flexShrink: 0,
          background: `linear-gradient(180deg, #0a0620 0%, #060312 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", position: "relative",
          borderRadius: "7px 7px 0 0",
        }}>
          {thumbnail ? (
            <>
              <img
                src={thumbnail}
                alt={displayName}
                style={{
                  width: "100%", height: "100%", objectFit: "contain", display: "block",
                  background: "#0c0820",
                  transition: "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                  transform: hovered ? "scale(1.05)" : "scale(1)",
                }}
              />
              {/* Active: dramatic bloom glow from thumbnail center */}
              {isActive && (
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: `radial-gradient(ellipse at 50% 60%, ${glow}35 0%, transparent 65%)`,
                }} />
              )}
              {/* Vignette */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
              }} />
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: thumbError
                  ? (errorCode === 410 ? "rgba(255,165,0,0.08)" : "rgba(239,68,68,0.08)")
                  : `${rail}0c`,
                border: `1px solid ${thumbError
                  ? (errorCode === 410 ? "rgba(255,165,0,0.25)" : "rgba(239,68,68,0.2)")
                  : rail + "1a"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Box style={{
                  width: 16, height: 16, opacity: 0.4,
                  color: thumbError ? (errorCode === 410 ? "#ffa500" : "#ef4444") : rail,
                }} />
              </div>
              {thumbError && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: errorCode === 410 ? "#ffa500" : "#6b7280",
                    fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
                  }}>
                    {errorCode === 410 ? "SRC_EXPIRED" : "NO_PREVIEW"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Failed overlay */}
          {item?.status === "failed" && !thumbnail && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(6,4,16,0.9)",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 6, zIndex: 2,
            }}>
              <AlertCircle style={{ width: 18, height: 18, color: "#ef4444", opacity: 0.8 }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#ef4444", fontSize: 8, letterSpacing: "0.1em" }}>FAILED</span>
            </div>
          )}

          {/* Active: top scan bar */}
          {isActive && (
            <div style={{
              position: "absolute", top: 0, left: 2, right: 0, height: 1.5,
              background: `linear-gradient(90deg, transparent 0%, ${rail}ff 30%, ${rail}ff 70%, transparent 100%)`,
              boxShadow: `0 0 8px ${rail}`,
              pointerEvents: "none",
            }} />
          )}

          {/* Type badge — bottom left */}
          <div style={{
            position: "absolute", bottom: 6, left: 8,
            display: "flex", alignItems: "center", gap: 3,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            border: `1px solid ${rail}30`, borderRadius: 4,
            padding: "2px 6px",
          }}>
            <typeConfig.Icon style={{ width: 7, height: 7, color: rail }} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 7, fontWeight: 700, color: rail, letterSpacing: "0.08em",
            }}>{typeConfig.label}</span>
          </div>

          {/* AI badge — bottom right */}
          {hasAiName && (
            <div style={{
              position: "absolute", bottom: 6, right: 8,
              display: "flex", alignItems: "center", gap: 3,
              background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
              border: `1px solid ${rail}25`, borderRadius: 4,
              padding: "2px 6px",
            }}>
              <Sparkles style={{ width: 6, height: 6, color: `${rail}aa` }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 7, color: `${rail}80`, letterSpacing: "0.08em",
              }}>AI</span>
            </div>
          )}

          {/* Bottom gradient fade */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 40,
            background: "linear-gradient(to bottom, transparent, rgba(4,2,14,0.9))",
            pointerEvents: "none",
          }} />
        </div>
      )}

      {/* ── Info panel ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "8px 10px 9px", paddingLeft: 12, position: "relative", zIndex: 1 }}>
        {/* Name */}
        <p style={{
          fontFamily: "'Rajdhani', sans-serif",
          color: isActive ? "#f0ecff" : hovered ? "#d8d3f0" : "#a8a3c0",
          fontSize: 12, fontWeight: 700, margin: "0 0 2px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          letterSpacing: "0.02em", lineHeight: 1.3,
          transition: "color 0.2s",
        }}>
          {displayName}
        </p>

        {/* Prompt */}
        {hasAiName && prompt && (
          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: "rgba(255,255,255,0.15)", fontSize: 8,
            margin: "0 0 6px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontStyle: "italic",
          }}>
            {prompt.slice(0, 80)}{prompt.length > 80 ? "…" : ""}
          </p>
        )}

        {/* Timestamp with hover tooltip for absolute time */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          {timeRel && (
            <div style={{ position: "relative" }}
              onMouseEnter={() => setTimeTooltip(true)}
              onMouseLeave={() => setTimeTooltip(false)}
            >
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(255,255,255,0.18)", fontSize: 8,
                letterSpacing: "0.04em", cursor: "default",
              }}>
                {timeRel}
              </span>
              {timeTooltip && timeAbs && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 4px)", left: 0,
                  background: "rgba(10,6,26,0.97)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 5, padding: "4px 8px", zIndex: 50,
                  whiteSpace: "nowrap", pointerEvents: "none",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em",
                  }}>{timeAbs}</span>
                </div>
              )}
            </div>
          )}
          {item?.params?.seed != null && !item?.params?.randomSeed && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "rgba(255,255,255,0.12)", fontSize: 7.5,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 3, padding: "1px 5px",
            }}>
              #{item.params.seed}
            </span>
          )}
        </div>

        {/* Actions — fade in on card hover */}
        <div className="hcard-actions" style={{ display: "flex", gap: 3 }}>
          <CmdBtn onClick={handleReuse} title="Reuse prompt" rail={rail} flex>
            <RotateCcw style={{ width: 9, height: 9 }} />
            {!isNarrow && <span>Reuse</span>}
          </CmdBtn>
          <CmdBtn onClick={handleDownload} title="Download" rail={rail}>
            <Download style={{ width: 9, height: 9 }} />
            {!isNarrow && <span>DL</span>}
          </CmdBtn>
          <CmdBtn onClick={handleDelete} title="Delete" rail="#ef4444" danger>
            <Trash2 style={{ width: 9, height: 9 }} />
            {!isNarrow && <span>Del</span>}
          </CmdBtn>
        </div>
      </div>
    </div>
  );
});

/* ─── CmdBtn — terminal-style action button ──────────────────────────────── */
function CmdBtn({ onClick, title, rail, danger, flex, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 3,
        padding: "4px 7px",
        borderRadius: 4, flex: flex ? "1" : undefined,
        justifyContent: flex ? "center" : undefined,
        border: `1px solid ${hov
          ? danger ? "rgba(239,68,68,0.45)" : `${rail}50`
          : "rgba(255,255,255,0.07)"}`,
        background: hov
          ? danger ? "rgba(239,68,68,0.12)" : `${rail}14`
          : "rgba(255,255,255,0.025)",
        color: hov ? (danger ? "#ef4444" : rail) : "rgba(255,255,255,0.25)",
        cursor: "pointer", transition: "all 0.14s",
        flexShrink: flex ? 0 : 1, minWidth: 0,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8, fontWeight: 500, letterSpacing: "0.04em",
        boxShadow: hov && !danger ? `0 0 10px ${rail}20` : "none",
      }}
    >
      {children}
    </button>
  );
}

export default HistoryCard;
